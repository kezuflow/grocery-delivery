import {
  canAccessCustomer,
  createSession,
  isSessionActive,
  type AdminPermission,
  type Role,
  type Session,
} from "@carbon/domain";

export const SESSION_COOKIE_NAMES = ["better-auth.session_token", "carbon.session"] as const;

export type SessionResolver = Readonly<{
  resolve(request: Request): Promise<Session | null>;
}>;

export type SessionTokenStore = Readonly<{
  findByTokenHash(tokenHash: string): Promise<Session | null>;
}>;

export type BetterAuthSessionResult = Readonly<{
  session: Readonly<{
    id: string;
    expiresAt: string | Date;
  }>;
  user: Readonly<{
    id: string;
    email?: string;
    role?: Role;
    adminPermissions?: readonly AdminPermission[];
    customerId?: string | null;
    mfaRequired?: boolean;
    mfaVerified?: boolean;
  }>;
}>;

export type BetterAuthApi = Readonly<{
  getSession(input: { headers: Headers }): Promise<BetterAuthSessionResult | null>;
  handler?(request: Request): Promise<Response>;
}>;

export type AuthCookieOptions = Readonly<{
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  maxAge: number;
}>;

export function createAuthCookieOptions(
  environment: "development" | "test" | "staging" | "production",
): AuthCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: environment === "staging" || environment === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

export async function resolveActiveSession(
  resolver: SessionResolver,
  request: Request,
  now: string,
): Promise<Session | null> {
  const session = await resolver.resolve(request);
  return session && isSessionActive(session, now) ? session : null;
}

export function createPersistentSessionResolver(store: SessionTokenStore): SessionResolver {
  return {
    async resolve(request) {
      const token = extractSessionToken(request.headers);
      if (!token) {
        return null;
      }
      return store.findByTokenHash(await hashSessionToken(token));
    },
  };
}

export function createBetterAuthSessionResolver(api: BetterAuthApi): SessionResolver {
  return {
    async resolve(request) {
      const result = await api.getSession({ headers: request.headers });
      if (!result) {
        return null;
      }
      const role = result.user.role ?? "customer";
      return createSession({
        id: result.session.id,
        userId: result.user.id,
        role,
        adminPermissions: role === "admin" ? (result.user.adminPermissions ?? []) : [],
        customerId: role === "customer" ? (result.user.customerId ?? result.user.id) : null,
        mfaRequired: result.user.mfaRequired ?? false,
        mfaVerified: result.user.mfaVerified ?? false,
        expiresAt:
          result.session.expiresAt instanceof Date
            ? result.session.expiresAt.toISOString()
            : result.session.expiresAt,
        revokedAt: null,
      });
    },
  };
}

export async function hashSessionToken(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function extractSessionToken(headers: Headers): string | null {
  const authorization = headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.slice("Bearer ".length).trim();
    return token || null;
  }
  const cookies = parseCookies(headers.get("cookie"));
  for (const name of SESSION_COOKIE_NAMES) {
    const token = cookies.get(name);
    if (token) {
      return token;
    }
  }
  return null;
}

export function isAuthorizedForAdminPermission(
  session: Session,
  permission: AdminPermission,
): boolean {
  return (
    session.role === "admin" &&
    (session.adminPermissions.includes("superadmin") ||
      session.adminPermissions.includes(permission))
  );
}

export function isAuthorizedForCustomer(session: Session, customerId: string): boolean {
  return canAccessCustomer(session, customerId);
}

export type SessionSummary = Readonly<{
  sessionId: string;
  userId: string;
  role: Role;
  adminPermissions: readonly AdminPermission[];
  customerId: string | null;
  mfaRequired: boolean;
  mfaVerified: boolean;
  expiresAt: string;
}>;

export function toSessionSummary(session: Session): SessionSummary {
  return {
    sessionId: session.id,
    userId: session.userId,
    role: session.role,
    adminPermissions: session.adminPermissions,
    customerId: session.customerId,
    mfaRequired: session.mfaRequired ?? false,
    mfaVerified: session.mfaVerified ?? false,
    expiresAt: session.expiresAt,
  };
}

function parseCookies(header: string | null): ReadonlyMap<string, string> {
  const cookies = new Map<string, string>();
  for (const part of header?.split(";") ?? []) {
    const separator = part.indexOf("=");
    if (separator < 1) {
      continue;
    }
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (name && value) {
      cookies.set(name, decodeURIComponent(value));
    }
  }
  return cookies;
}
