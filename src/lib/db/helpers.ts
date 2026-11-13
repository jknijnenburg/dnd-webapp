import { eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import type { DbOrTx, Tx } from "./index";
import { campaignEvents, campaigns, shops } from "./schema";

/** Postgres error code of a (possibly Drizzle-wrapped) driver error. */
export function pgErrorCode(error: unknown): string | undefined {
  for (let e: unknown = error, depth = 0; e && depth < 4; depth++) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code;
    e = (e as { cause?: unknown }).cause;
  }
  return undefined;
}
export const isUniqueViolation = (e: unknown) => pgErrorCode(e) === "23505";
export const isForeignKeyViolation = (e: unknown) => pgErrorCode(e) === "23503";

/**
 * Lock order (prevents deadlocks): campaign row first, then shop rows ordered by id.
 * Row locks are transaction-scoped, so they are safe behind PgBouncer / Neon pooling.
 */
export async function lockCampaign(tx: Tx, campaignId: string) {
  const [campaign] = await tx.select().from(campaigns).where(eq(campaigns.id, campaignId)).for("update");
  if (!campaign) throw new NotFoundError("Die Kampagne wurde nicht gefunden.");
  return campaign;
}

export async function lockShop(tx: Tx, shopId: string) {
  const [shop] = await tx.select().from(shops).where(eq(shops.id, shopId)).for("update");
  if (!shop) throw new NotFoundError("Der Händler wurde nicht gefunden.");
  return shop;
}

export async function recordEvent(
  db: DbOrTx,
  event: { campaignId: string; actorRole: string; eventType: string; before?: unknown; after?: unknown },
): Promise<void> {
  await db.insert(campaignEvents).values({
    campaignId: event.campaignId,
    actorRole: event.actorRole,
    eventType: event.eventType,
    beforeJson: event.before ?? null,
    afterJson: event.after ?? null,
  });
}
