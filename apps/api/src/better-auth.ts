import { betterAuth } from "better-auth";
import type { BetterAuthApi } from "@carbon/auth";
import { ConfigurationError, type ApiRuntimeConfiguration } from "@carbon/config";
import { D1IdentityRepository } from "@carbon/db";
import { twoFactor } from "better-auth/plugins";
import type { IdentityEmailSender } from "@carbon/notifications";
import type { ApiBindings } from "./app.js";

export function createConfiguredBetterAuthApi(
  bindings: ApiBindings,
  configuration: ApiRuntimeConfiguration,
  identityEmailSender?: IdentityEmailSender,
): BetterAuthApi {
  if (!bindings.DB) {
    throw new ConfigurationError("DB", "Better Auth requires a DB binding");
  }
  if (!configuration.betterAuthSecret || !configuration.betterAuthUrl) {
    throw new ConfigurationError(
      "AUTH_MODE",
      "Better Auth requires BETTER_AUTH_SECRET and BETTER_AUTH_URL",
    );
  }
  const auth = betterAuth({
    database: bindings.DB,
    secret: configuration.betterAuthSecret,
    baseURL: configuration.betterAuthUrl,
    basePath: "/api/auth",
    trustedOrigins: [...configuration.betterAuthTrustedOrigins],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification:
        configuration.environment === "staging" || configuration.environment === "production",
      ...(identityEmailSender
        ? {
            sendResetPassword: async ({ user, url, token }) => {
              await identityEmailSender.send({
                idempotencyKey: `password-reset:${user.id}:${token}`,
                recipient: user.email,
                type: "password_reset",
                actionUrl: url,
              });
            },
          }
        : {}),
    },
    ...(identityEmailSender
      ? {
          emailVerification: {
            sendOnSignUp: true,
            sendVerificationEmail: async ({ user, url, token }) => {
              await identityEmailSender.send({
                idempotencyKey: `email-verification:${user.id}:${token}`,
                recipient: user.email,
                type: "email_verification",
                actionUrl: url,
              });
            },
          },
        }
      : {}),
    plugins: [
      twoFactor({
        issuer: "Carbon Food Delivery",
        twoFactorTable: "better_auth_two_factor",
        schema: {
          user: { fields: { twoFactorEnabled: "two_factor_enabled" } },
        },
      }),
    ],
    user: {
      modelName: "better_auth_user",
      fields: {
        emailVerified: "email_verified",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    },
    session: {
      modelName: "better_auth_session",
      fields: {
        expiresAt: "expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at",
        ipAddress: "ip_address",
        userAgent: "user_agent",
        userId: "user_id",
      },
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    account: {
      modelName: "better_auth_account",
      fields: {
        accountId: "account_id",
        providerId: "provider_id",
        userId: "user_id",
        accessToken: "access_token",
        refreshToken: "refresh_token",
        idToken: "id_token",
        accessTokenExpiresAt: "access_token_expires_at",
        refreshTokenExpiresAt: "refresh_token_expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    },
    verification: {
      modelName: "better_auth_verification",
      fields: {
        expiresAt: "expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
      storeIdentifier: "hashed",
    },
    advanced: {
      useSecureCookies:
        configuration.environment === "staging" || configuration.environment === "production",
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure:
          configuration.environment === "staging" || configuration.environment === "production",
      },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            const createdAt = toIsoTimestamp(user.createdAt);
            await identity.saveUser({
              id: user.id,
              email: user.email,
              name: user.name,
              emailVerified: user.emailVerified,
              imageUrl: user.image ?? null,
              createdAt,
              updatedAt: toIsoTimestamp(user.updatedAt),
            });
            const isBootstrapAdmin = configuration.adminBootstrapEmails.includes(
              user.email.trim().toLowerCase(),
            );
            await identity.saveRoleAssignment(
              {
                userId: user.id,
                role: isBootstrapAdmin ? "admin" : "customer",
                adminPermissions: isBootstrapAdmin ? ["superadmin"] : [],
                assignedAt: createdAt,
              },
              isBootstrapAdmin ? null : user.id,
              isBootstrapAdmin,
            );
            if (isBootstrapAdmin) {
              await identity.saveAuditEvent({
                id: `audit-bootstrap-${user.id}`,
                actorUserId: null,
                action: "identity.admin-bootstrapped",
                targetType: "user",
                targetId: user.id,
                occurredAt: createdAt,
                metadata: { email: user.email.toLowerCase() },
              });
            }
          },
        },
        update: {
          after: async (user) => {
            await identity.saveUser({
              id: user.id,
              email: user.email,
              name: user.name,
              emailVerified: user.emailVerified,
              imageUrl: user.image ?? null,
              createdAt: toIsoTimestamp(user.createdAt),
              updatedAt: toIsoTimestamp(user.updatedAt),
            });
          },
        },
      },
    },
  });
  const identity = new D1IdentityRepository(bindings.DB);
  return {
    async handler(request) {
      const origin = request.headers.get("origin");
      if (origin && !isTrustedOrigin(origin, configuration)) {
        return Response.json({ error: "untrusted origin" }, { status: 403 });
      }
      return auth.handler(request);
    },
    async getSession(input) {
      const result = await auth.api.getSession(input);
      if (!result) return null;
      const assignment = await identity.findRoleAssignment(result.user.id);
      if (!assignment) return null;
      return {
        session: { id: result.session.id, expiresAt: result.session.expiresAt },
        user: {
          id: result.user.id,
          role: assignment?.role ?? "customer",
          adminPermissions: assignment?.adminPermissions ?? [],
          customerId: assignment.role === "customer" ? assignment.customerId : null,
          mfaRequired: assignment.mfaRequired,
          mfaVerified:
            !assignment.mfaRequired ||
            Boolean((result.user as { twoFactorEnabled?: boolean }).twoFactorEnabled),
        },
      };
    },
  };
}

function isTrustedOrigin(origin: string, configuration: ApiRuntimeConfiguration): boolean {
  return [configuration.betterAuthUrl, ...configuration.betterAuthTrustedOrigins].includes(origin);
}

function toIsoTimestamp(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
