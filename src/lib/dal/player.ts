import "server-only";
import { cache } from "react";
import { assertPlayer } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getCampaignBySlug, listCampaigns } from "@/features/campaigns/service";
import { getShopForPlayer, listShops } from "@/features/shops/service";

/**
 * Data access layer for player pages. Every function re-checks the session
 * itself, so data cannot leak even if a page or the proxy forgets a check.
 * Nothing here is cached across requests.
 */
export const playerListCampaigns = cache(async () => {
  await assertPlayer();
  return listCampaigns(getDb());
});

/** Memoised per request: layout and page share one query. */
export const playerGetCampaign = cache(async (slug: string) => {
  await assertPlayer();
  return getCampaignBySlug(getDb(), slug);
});

export async function playerListShops(campaignId: string) {
  await assertPlayer();
  return listShops(getDb(), campaignId, { onlyVisible: true });
}

export async function playerGetShop(campaignId: string, shopId: string) {
  await assertPlayer();
  return getShopForPlayer(getDb(), campaignId, shopId);
}
