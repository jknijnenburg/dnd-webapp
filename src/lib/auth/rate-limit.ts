import { createHmac } from "node:crypto";
import { and, count, eq, gte, lt, sql } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { loginAttempts } from "@/lib/db/schema";

/**
 * PostgreSQL-backed login throttling (works across serverless instances).
 * Only *failed* attempts are stored.
 * - per client (hashed IP) and scope: MAX_FAILURES_PER_CLIENT failures per window
 * - per scope globally: MAX_FAILURES_GLOBAL failures per window (slows distributed guessing)
 * Rows older than RETENTION are deleted opportunistically on each attempt.
 */
export const WINDOW_MS = 15 * 60 * 1000;
export const MAX_FAILURES_PER_CLIENT = 5;
export const MAX_FAILURES_GLOBAL = 200;
export const RETENTION_MS = 24 * 60 * 60 * 1000;

export type LoginScope = "player" | "admin";

export function hashClientIp(ip: string, secret: string): string {
  return createHmac("sha256", secret).update(`ip:${ip}`).digest("base64url").slice(0, 32);
}

export type AttemptTicket =
  | { allowed: true; attemptId: number }
  | { allowed: false; retryAfterSeconds: number };

async function countFailures(db: Db, scope: LoginScope, ipHash: string | null, since: Date) {
  const [row] = await db
    .select({ failures: count(), oldest: sql<string | null>`min(${loginAttempts.createdAt})` })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.scope, scope),
        ipHash === null ? undefined : eq(loginAttempts.ipHash, ipHash),
        gte(loginAttempts.createdAt, since),
      ),
    );
  return row;
}

/**
 * Call BEFORE verifying a password. The attempt is pessimistically recorded as
 * a failure first, so parallel requests cannot overshoot the limit; a
 * successful login removes the client's failures via `completeLoginAttempt`.
 * Attempts made while locked out are not recorded (they do not extend the lockout).
 */
export async function beginLoginAttempt(
  db: Db,
  scope: LoginScope,
  ipHash: string,
  now: Date = new Date(),
): Promise<AttemptTicket> {
  const since = new Date(now.getTime() - WINDOW_MS);
  const blocked = (oldest: string | null): AttemptTicket => {
    const oldestMs = oldest ? new Date(oldest).getTime() : now.getTime();
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldestMs + WINDOW_MS - now.getTime()) / 1000)),
    };
  };

  const before = await countFailures(db, scope, ipHash, since);
  if (before.failures >= MAX_FAILURES_PER_CLIENT) return blocked(before.oldest);
  const globalBefore = await countFailures(db, scope, null, since);
  if (globalBefore.failures >= MAX_FAILURES_GLOBAL) return blocked(globalBefore.oldest);

  const [inserted] = await db
    .insert(loginAttempts)
    .values({ scope, ipHash, createdAt: now })
    .returning({ id: loginAttempts.id });

  const after = await countFailures(db, scope, ipHash, since);
  if (after.failures > MAX_FAILURES_PER_CLIENT) {
    await db.delete(loginAttempts).where(eq(loginAttempts.id, inserted.id));
    return blocked(after.oldest);
  }
  return { allowed: true, attemptId: inserted.id };
}

export async function completeLoginAttempt(
  db: Db,
  scope: LoginScope,
  ipHash: string,
  success: boolean,
  now: Date = new Date(),
): Promise<void> {
  if (success) {
    await db
      .delete(loginAttempts)
      .where(and(eq(loginAttempts.scope, scope), eq(loginAttempts.ipHash, ipHash)));
  }
  await db.delete(loginAttempts).where(lt(loginAttempts.createdAt, new Date(now.getTime() - RETENTION_MS)));
}
