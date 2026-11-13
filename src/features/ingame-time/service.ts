import { asc, eq } from "drizzle-orm";
import type { Db, DbOrTx } from "@/lib/db";
import { lockCampaign, recordEvent } from "@/lib/db/helpers";
import { campaigns, shops } from "@/lib/db/schema";
import { MAX_ADVANCE_DAYS, MAX_DAY } from "@/lib/constants";
import { ConflictError, UserFacingError } from "@/lib/errors";
import { getListOrderByShop, listShops } from "@/features/shops/service";
import { applyScheduledRotations } from "./rotation";

export interface ShopRotationSummary {
  shopId: string;
  shopName: string;
  rotationsDue: number;
  rotationDays: number[];
  fromListId: string | null;
  fromListName: string | null;
  toListId: string | null;
  toListName: string | null;
  previousNextRefreshDay: number;
  nextRefreshDay: number;
  listCount: number;
}

export interface AdvanceResult {
  campaignId: string;
  previousDay: number;
  newDay: number;
  rotations: ShopRotationSummary[];
}

export interface AdvanceInput {
  campaignId: string;
  days: number;
  /**
   * The day the admin saw when submitting. If the campaign has moved on in the
   * meantime (double click, retry, second admin tab) the request is rejected
   * instead of being applied twice.
   */
  expectedCurrentDay: number;
  actorRole: string;
}

/**
 * Advances a campaign's in-game day and applies every due shop rotation.
 * Day counter, shop updates and audit events are written in ONE transaction;
 * the campaign row lock serialises concurrent admin actions (spec §6.11).
 * Only this campaign's rows are touched.
 */
export async function advanceCampaignDay(db: Db, input: AdvanceInput): Promise<AdvanceResult> {
  const { campaignId, days, expectedCurrentDay, actorRole } = input;
  if (!Number.isInteger(days) || days < 1 || days > MAX_ADVANCE_DAYS) {
    throw new UserFacingError(`Bitte zwischen 1 und ${MAX_ADVANCE_DAYS} Tagen voranschreiten.`);
  }
  return db.transaction(async (tx) => {
    const campaign = await lockCampaign(tx, campaignId);
    if (campaign.currentDay !== expectedCurrentDay) {
      throw new ConflictError(
        `Die Kampagne steht inzwischen bei Tag ${campaign.currentDay}. Es wurde nichts geändert – bitte erneut prüfen.`,
      );
    }
    const newDay = campaign.currentDay + days;
    if (newDay > MAX_DAY) throw new UserFacingError(`Der Tageszähler darf ${MAX_DAY} nicht überschreiten.`);

    const shopRows = await tx
      .select()
      .from(shops)
      .where(eq(shops.campaignId, campaignId))
      .orderBy(asc(shops.id))
      .for("update");
    const listsByShop = await getListOrderByShop(tx, campaignId);

    const rotations: ShopRotationSummary[] = [];
    for (const shop of shopRows) {
      const lists = listsByShop.get(shop.id) ?? [];
      const result = applyScheduledRotations(
        {
          refreshIntervalDays: shop.refreshIntervalDays,
          nextRefreshDay: shop.nextRefreshDay,
          listIds: lists.map((l) => l.id),
          activeListId: shop.activeInventoryListId,
        },
        newDay,
      );
      if (result.rotationsDue === 0) continue;
      await tx
        .update(shops)
        .set({ nextRefreshDay: result.nextRefreshDay, activeInventoryListId: result.activeListId })
        .where(eq(shops.id, shop.id));
      const nameOf = (id: string | null) => lists.find((l) => l.id === id)?.name ?? null;
      const summary: ShopRotationSummary = {
        shopId: shop.id,
        shopName: shop.name,
        rotationsDue: result.rotationsDue,
        rotationDays: result.rotationDays,
        fromListId: shop.activeInventoryListId,
        fromListName: nameOf(shop.activeInventoryListId),
        toListId: result.activeListId,
        toListName: nameOf(result.activeListId),
        previousNextRefreshDay: shop.nextRefreshDay,
        nextRefreshDay: result.nextRefreshDay,
        listCount: lists.length,
      };
      rotations.push(summary);
      await recordEvent(tx, {
        campaignId,
        actorRole,
        eventType: "shop_rotated_scheduled",
        before: {
          shopId: shop.id,
          activeListId: summary.fromListId,
          nextRefreshDay: summary.previousNextRefreshDay,
        },
        after: {
          shopId: shop.id,
          activeListId: summary.toListId,
          nextRefreshDay: summary.nextRefreshDay,
          rotationsDue: summary.rotationsDue,
        },
      });
    }

    await tx.update(campaigns).set({ currentDay: newDay }).where(eq(campaigns.id, campaignId));
    await recordEvent(tx, {
      campaignId,
      actorRole,
      eventType: "day_advanced",
      before: { currentDay: campaign.currentDay },
      after: { currentDay: newDay, days, rotatedShops: rotations.length },
    });

    return { campaignId, previousDay: campaign.currentDay, newDay, rotations };
  });
}

export interface RotationPreviewRow {
  shopId: string;
  shopName: string;
  isVisible: boolean;
  refreshIntervalDays: number;
  nextRefreshDay: number;
  daysUntilRefresh: number;
  listCount: number;
  activeListName: string | null;
  /** What a jump of +1, +3, +7 … days would trigger (read-only what-if). */
  whatIf: { days: number; rotationsDue: number; toListName: string | null }[];
}

/** Read-only preview of upcoming rotations; never writes. */
export async function getRotationPreview(
  db: DbOrTx,
  campaignId: string,
  currentDay: number,
  jumps: number[] = [1, 3, 7, 30],
): Promise<RotationPreviewRow[]> {
  const [shopRows, listsByShop] = await Promise.all([
    listShops(db, campaignId, { onlyVisible: false }),
    getListOrderByShop(db, campaignId),
  ]);
  return shopRows
    .map((shop) => {
      const lists = listsByShop.get(shop.id) ?? [];
      const nameOf = (id: string | null) => lists.find((l) => l.id === id)?.name ?? null;
      const state = {
        refreshIntervalDays: shop.refreshIntervalDays,
        nextRefreshDay: shop.nextRefreshDay,
        listIds: lists.map((l) => l.id),
        activeListId: shop.activeInventoryListId,
      };
      return {
        shopId: shop.id,
        shopName: shop.name,
        isVisible: shop.isVisible,
        refreshIntervalDays: shop.refreshIntervalDays,
        nextRefreshDay: shop.nextRefreshDay,
        daysUntilRefresh: Math.max(shop.nextRefreshDay - currentDay, 0),
        listCount: lists.length,
        activeListName: nameOf(shop.activeInventoryListId),
        whatIf: jumps.map((days) => {
          const r = applyScheduledRotations(state, currentDay + days);
          return { days, rotationsDue: r.rotationsDue, toListName: nameOf(r.activeListId) };
        }),
      };
    })
    .sort((a, b) => a.nextRefreshDay - b.nextRefreshDay || a.shopName.localeCompare(b.shopName, "de"));
}
