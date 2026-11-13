import "server-only";
import { assertAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { exportCampaign } from "@/features/campaigns/export";
import {
  getCampaignById,
  getCampaignStats,
  listCampaignEvents,
  listCampaigns,
} from "@/features/campaigns/service";
import { getRotationPreview } from "@/features/ingame-time/service";
import { countItemUsage, getItem, getItemUsage, listItems, type ItemFilter } from "@/features/items/service";
import { countListsByShop, getShopForAdmin, listShops } from "@/features/shops/service";

/** Data access layer for admin pages; every read re-checks the admin session. */
async function adminDb() {
  await assertAdmin();
  return getDb();
}

export const adminListCampaigns = async () => listCampaigns(await adminDb());
export const adminGetCampaign = async (id: string) => getCampaignById(await adminDb(), id);
export const adminCampaignStats = async () => getCampaignStats(await adminDb());
export const adminListEvents = async (campaignId: string) => listCampaignEvents(await adminDb(), campaignId);
export const adminRotationPreview = async (campaignId: string, currentDay: number) =>
  getRotationPreview(await adminDb(), campaignId, currentDay);
export const adminListShops = async (campaignId: string) =>
  listShops(await adminDb(), campaignId, { onlyVisible: false });
export const adminListCounts = async (campaignId: string) => countListsByShop(await adminDb(), campaignId);
export const adminGetShop = async (shopId: string) => getShopForAdmin(await adminDb(), shopId);
export const adminListItems = async (campaignId: string, filter?: ItemFilter) =>
  listItems(await adminDb(), campaignId, filter);
export const adminItemUsageCounts = async (campaignId: string) => countItemUsage(await adminDb(), campaignId);
export const adminGetItem = async (id: string) => getItem(await adminDb(), id);
export const adminItemUsage = async (itemId: string) => getItemUsage(await adminDb(), itemId);
export const adminExportCampaign = async (campaignId: string) => exportCampaign(await adminDb(), campaignId);
