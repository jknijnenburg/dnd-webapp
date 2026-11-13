import "server-only";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { assertAdmin } from "@/lib/auth/session";
import { getDb, type Db } from "@/lib/db";
import { ConfigError } from "@/lib/env";
import { AuthError, UserFacingError } from "@/lib/errors";

/**
 * Wrapper for every mutating server action:
 * 1. re-checks the admin session on the server (UI visibility is not security),
 * 2. runs the mutation,
 * 3. invalidates rendered output so all pages show the new state,
 * 4. maps errors to safe, German messages (no internals leak to the client).
 *
 * CSRF: Server Actions only accept POST and Next.js rejects requests whose
 * Origin does not match the Host; the session cookie is SameSite=Lax.
 */
export async function runAdminAction(
  fn: (db: Db) => Promise<string | void>,
): Promise<ActionState> {
  try {
    await assertAdmin();
    const message = await fn(getDb());
    revalidatePath("/", "layout");
    return { status: "success", message: message || "Gespeichert.", nonce: Date.now() };
  } catch (error) {
    unstable_rethrow(error); // let redirect()/notFound() pass through
    return { ...toErrorState(error), nonce: Date.now() };
  }
}

function toErrorState(error: unknown): ActionState {
  if (error instanceof z.ZodError) {
    return {
      status: "error",
      message: "Bitte die markierten Eingaben prüfen.",
      fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[]>,
    };
  }
  if (error instanceof AuthError) {
    return {
      status: "error",
      message:
        error.reason === "forbidden"
          ? "Keine Berechtigung. Bitte erneut als Admin anmelden."
          : "Die Sitzung ist abgelaufen. Bitte erneut anmelden.",
    };
  }
  if (error instanceof UserFacingError) return { status: "error", message: error.message };
  if (error instanceof ConfigError) {
    console.error(`[admin] ${error.message}`);
    return { status: "error", message: "Die Server-Konfiguration ist unvollständig." };
  }
  console.error("[admin] action failed:", error);
  return { status: "error", message: "Das hat leider nicht geklappt. Bitte erneut versuchen." };
}
