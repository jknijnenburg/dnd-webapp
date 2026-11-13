"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { getDb } from "@/lib/db";
import { ConfigError, getEnv } from "@/lib/env";
import { verifyPassword } from "./password";
import { beginLoginAttempt, completeLoginAttempt, hashClientIp, type LoginScope } from "./rate-limit";
import { clearSessionCookie, getSession, writeSessionCookie } from "./session";
import { dropAdmin, elevateToAdmin, newPlayerPayload, safeRedirectPath } from "./session-token";

const loginSchema = z.object({
  password: z.string().min(1).max(256),
  next: z.string().max(512).optional(),
});

const error = (message: string): ActionState => ({ status: "error", message, nonce: Date.now() });

async function clientIp(): Promise<string> {
  const h = await headers();
  // On Vercel the first x-forwarded-for entry is the client address set by the platform.
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/**
 * Shared flow for both logins: throttle -> verify -> record. Returns null on
 * success, otherwise a user-safe error state. The same generic message is
 * used for every credential failure.
 */
async function attemptLogin(scope: LoginScope, password: string): Promise<ActionState | null> {
  try {
    const env = getEnv("SESSION_SECRET", "PLAYER_PASSWORD_HASH", "ADMIN_PASSWORD_HASH", "DATABASE_URL");
    const db = getDb();
    const ipHash = hashClientIp(await clientIp(), env.SESSION_SECRET);
    const ticket = await beginLoginAttempt(db, scope, ipHash);
    if (!ticket.allowed) {
      const minutes = Math.ceil(ticket.retryAfterSeconds / 60);
      return error(`Zu viele Fehlversuche. Bitte in etwa ${minutes} Minute${minutes === 1 ? "" : "n"} erneut versuchen.`);
    }
    const verifier = scope === "admin" ? env.ADMIN_PASSWORD_HASH : env.PLAYER_PASSWORD_HASH;
    const ok = await verifyPassword(password, verifier);
    await completeLoginAttempt(db, scope, ipHash, ok);
    return ok ? null : error("Das Passwort ist nicht korrekt.");
  } catch (e) {
    if (e instanceof ConfigError) {
      console.error(`[auth] ${e.message}`);
      return error("Die Anwendung ist noch nicht vollständig eingerichtet (Server-Konfiguration fehlt).");
    }
    console.error("[auth] login failed:", e instanceof Error ? e.message : "unknown error");
    return error("Die Anmeldung ist gerade nicht möglich (Datenbank nicht erreichbar). Bitte später erneut versuchen.");
  }
}

export async function loginPlayerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({ password: formData.get("password"), next: formData.get("next") ?? undefined });
  if (!parsed.success) return error("Bitte das Gruppenpasswort eingeben.");
  const failure = await attemptLogin("player", parsed.data.password);
  if (failure) return failure;
  await writeSessionCookie(newPlayerPayload(Math.floor(Date.now() / 1000)));
  redirect(safeRedirectPath(parsed.data.next, "/campaigns"));
}

export async function loginAdminAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // The admin login is only reachable after the group login.
  const session = await getSession();
  if (!session) redirect("/login?next=/admin/login");
  const parsed = loginSchema.safeParse({ password: formData.get("password"), next: formData.get("next") ?? undefined });
  if (!parsed.success) return error("Bitte das Admin-Passwort eingeben.");
  const failure = await attemptLogin("admin", parsed.data.password);
  if (failure) return failure;
  await writeSessionCookie(elevateToAdmin(session, Math.floor(Date.now() / 1000)));
  const next = safeRedirectPath(parsed.data.next, "/admin");
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}

/** Gives up admin rights but stays logged in as a player. */
export async function leaveAdminAction(): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  await writeSessionCookie(dropAdmin(session));
  redirect("/campaigns");
}
