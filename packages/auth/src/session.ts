import {
  canAccessCustomer,
  isSessionActive,
  type AdminPermission,
  type Role,
  type Session,
} from "@carbon/domain";

export type SessionResolver = Readonly<{
  resolve(request: Request): Promise<Session | null>;
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
  expiresAt: string;
}>;

export function toSessionSummary(session: Session): SessionSummary {
  return {
    sessionId: session.id,
    userId: session.userId,
    role: session.role,
    adminPermissions: session.adminPermissions,
    customerId: session.customerId,
    expiresAt: session.expiresAt,
  };
}
