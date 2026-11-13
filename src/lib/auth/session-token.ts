import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stateless signed session token: base64url(JSON payload) + "." + HMAC-SHA256.
 * Pure functions (secret and clock are passed in) so they are unit-testable and
 * usable from proxy.ts as well as from the server-side guards.
 */
export const SESSION_COOKIE = "cch_session";
export const PLAYER_SESSION_SECONDS = 60 * 60 * 24 * 14; // 14 days
export const ADMIN_SESSION_SECONDS = 60 * 60 * 8; // 8 hours

export type Role = "player" | "admin";

export interface SessionPayload {
  v: 1;
  /** Player access expiry (unix seconds). */
  exp: number;
  /** Admin elevation expiry (unix seconds); 0 when not elevated. */
  adminExp: number;
}

export interface Session {
  role: Role;
  expiresAt: number;
  adminExpiresAt: number;
}

function sign(body: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(body).digest();
}

export function createSessionToken(payload: SessionPayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body, secret).toString("base64url")}`;
}

export function verifySessionToken(
  token: string | undefined | null,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Session | null {
  if (!token || token.length > 512 || secret.length < 32) return null;
  const dot = token.indexOf(".");
  if (dot <= 0 || dot !== token.lastIndexOf(".")) return null;
  const body = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1), "base64url");
  const expected = sign(body, secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof payload !== "object" || payload === null) return null;
  const { v, exp, adminExp } = payload as Record<string, unknown>;
  if (v !== 1 || !Number.isInteger(exp) || !Number.isInteger(adminExp)) return null;
  if ((exp as number) <= nowSeconds) return null;
  const isAdmin = (adminExp as number) > nowSeconds;
  return { role: isAdmin ? "admin" : "player", expiresAt: exp as number, adminExpiresAt: adminExp as number };
}

export function newPlayerPayload(nowSeconds: number): SessionPayload {
  return { v: 1, exp: nowSeconds + PLAYER_SESSION_SECONDS, adminExp: 0 };
}

/** Elevates an existing, valid player session; the player expiry is kept. */
export function elevateToAdmin(session: Session, nowSeconds: number): SessionPayload {
  return {
    v: 1,
    exp: Math.max(session.expiresAt, nowSeconds + ADMIN_SESSION_SECONDS),
    adminExp: nowSeconds + ADMIN_SESSION_SECONDS,
  };
}

export function dropAdmin(session: Session): SessionPayload {
  return { v: 1, exp: session.expiresAt, adminExp: 0 };
}

/** Only same-site relative paths are allowed as post-login redirect targets. */
export function safeRedirectPath(next: unknown, fallback: string): string {
  if (typeof next !== "string" || next.length > 512) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\r\n]/.test(next)) {
    return fallback;
  }
  return next;
}
