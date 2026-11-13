import { asc, eq } from "drizzle-orm";
import type { DbOrTx } from "@/lib/db";
import { campaignThemes, campaigns, inventoryListItems, inventoryLists, items, shops } from "@/lib/db/schema";

/** Complete JSON snapshot of one campaign (admin-only backup/export). */
export async function exportCampaign(db: DbOrTx, campaignId: string) {
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId));
  if (!campaign) return null;
  const [theme] = await db.select().from(campaignThemes).where(eq(campaignThemes.campaignId, campaignId));
  const [shopRows, listRows, itemRows, entryRows] = await Promise.all([
    db.select().from(shops).where(eq(shops.campaignId, campaignId)).orderBy(asc(shops.name)),
    db.select().from(inventoryLists).where(eq(inventoryLists.campaignId, campaignId)).orderBy(asc(inventoryLists.sortOrder)),
    db.select().from(items).where(eq(items.campaignId, campaignId)).orderBy(asc(items.name)),
    db.select().from(inventoryListItems).where(eq(inventoryListItems.campaignId, campaignId)).orderBy(asc(inventoryListItems.sortOrder)),
  ]);
  return {
    format: "dnd-campaign-hub/export",
    version: 1,
    exportedAt: new Date().toISOString(),
    campaign,
    theme: theme ?? null,
    items: itemRows,
    shops: shopRows.map((shop) => ({
      ...shop,
      inventoryLists: listRows
        .filter((l) => l.shopId === shop.id)
        .map((list) => ({ ...list, entries: entryRows.filter((e) => e.inventoryListId === list.id) })),
    })),
  };
}
