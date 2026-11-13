import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getEnv } from "@/lib/env";
import { AuthError } from "@/lib/errors";
import {
  SESSION_COOKIE,
  createSessionToken,
  verifySessionToken,
  type Session,
  type SessionPayload,
} from "./session-token";

/** Reads and verifies the session cookie (memoised per request). */
export const getSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  // Session checks depend on the current time and must always run at request
  // time – never during prerendering or prefetching.
  await connection();
  const { SESSION_SECRET } = getEnv("SESSION_SECRET");
  return verifySessionToken(token, SESSION_SECRET);
});

/** For pages: redirects to the login when there is no valid session. */
export async function requirePlayerPage(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** For admin pages: player session first, then admin elevation. */
export async function requireAdminPage(): Promise<Session> {
  const session = await requirePlayerPage();
  if (session.role !== "admin") redirect("/admin/login");
  return session;
}

/** For data access, server actions and route handlers: throws instead of redirecting. */
export async function assertPlayer(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new AuthError("unauthenticated");
  return session;
}

export async function assertAdmin(): Promise<Session> {
  const session = await assertPlayer();
  if (session.role !== "admin") throw new AuthError("forbidden");
  return session;
}

export async function writeSessionCookie(payload: SessionPayload): Promise<void> {
  const { SESSION_SECRET } = getEnv("SESSION_SECRET");
  const now = Math.floor(Date.now() / 1000);
  (await cookies()).set(SESSION_COOKIE, createSessionToken(payload, SESSION_SECRET), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(payload.exp - now, 0),
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
