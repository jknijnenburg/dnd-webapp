import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import { campaignEvents, campaigns, inventoryListItems, inventoryLists, items, shops } from "@/lib/db/schema";
import { ConflictError } from "@/lib/errors";
import { createCampaign, deleteCampaign, getCampaignById } from "@/features/campaigns/service";
import { exportCampaign } from "@/features/campaigns/export";
import { advanceCampaignDay, getRotationPreview } from "@/features/ingame-time/service";
import { createItem, deleteItem } from "@/features/items/service";
import {
  addItemToList,
  createInventoryList,
  createShop,
  deleteInventoryList,
  getShopForAdmin,
  getShopForPlayer,
  listShops,
  moveInventoryList,
  moveListItem,
  removeListItem,
  rotateShopManually,
  updateShop,
} from "@/features/shops/service";
import { closeTestDb, hasTestDb, resetTestDb, setupTestDb } from "../helpers/db";

const shopInput = (name: string, refreshIntervalDays: number, isVisible = true) => ({
  name,
  description: "",
  merchantName: null,
  category: null,
  imagePath: null,
  refreshIntervalDays,
  isVisible,
});
const itemInput = (name: string, basePriceCopper = 5000) => ({
  name,
  description: "Beschreibung",
  category: "potion" as const,
  rarity: "common" as const,
  imagePath: null,
  basePriceCopper,
  displayCurrency: "gp" as const,
  properties: "",
  dmNotes: "GEHEIM",
});

describe.skipIf(!hasTestDb)("rotation and inventory (PostgreSQL integration)", () => {
  let db: Db;
  let campaignId: string;

  const newCampaign = (slug: string, startDay = 1) =>
    createCampaign(db, { name: slug, slug, description: "", coverImagePath: null, startDay }, "admin");
  const shopRow = async (id: string) => (await db.select().from(shops).where(eq(shops.id, id)))[0];
  const day = async (id: string) => (await getCampaignById(db, id))!.currentDay;
  const advance = (days: number, expectedCurrentDay: number, id = campaignId) =>
    advanceCampaignDay(db, { campaignId: id, days, expectedCurrentDay, actorRole: "admin" });
  async function shopWithLists(name: string, interval: number, listCount: number, id = campaignId) {
    const shopId = await createShop(db, id, shopInput(name, interval), "admin");
    const listIds: string[] = [];
    for (let i = 1; i <= listCount; i++) listIds.push(await createInventoryList(db, shopId, `Liste ${i}`));
    return { shopId, listIds };
  }

  beforeAll(async () => {
    db = await setupTestDb();
  });
  beforeEach(async () => {
    await resetTestDb();
    campaignId = await newCampaign("alpha");
  });
  afterAll(closeTestDb);

  it("schedules a new shop at currentDay + interval and activates its first list", async () => {
    const { shopId, listIds } = await shopWithLists("Krämer", 7, 3);
    const shop = await shopRow(shopId);
    expect(shop.nextRefreshDay).toBe(8);
    expect(shop.activeInventoryListId).toBe(listIds[0]);
  });

  it("day 7 triggers nothing, day 8 triggers exactly one rotation", async () => {
    const { shopId, listIds } = await shopWithLists("Krämer", 7, 3);
    const first = await advance(6, 1);
    expect(first.newDay).toBe(7);
    expect(first.rotations).toHaveLength(0);
    expect((await shopRow(shopId)).activeInventoryListId).toBe(listIds[0]);

    const second = await advance(1, 7);
    expect(second.rotations).toHaveLength(1);
    expect(second.rotations[0]).toMatchObject({ rotationsDue: 1, nextRefreshDay: 15 });
    const shop = await shopRow(shopId);
    expect(shop.activeInventoryListId).toBe(listIds[1]);
    expect(shop.nextRefreshDay).toBe(15);
  });

  it("jump from day 1 to 22 applies 3 rotations at once and wraps around", async () => {
    const { shopId, listIds } = await shopWithLists("Krämer", 7, 3);
    const result = await advance(21, 1);
    expect(result.rotations[0].rotationsDue).toBe(3);
    expect(result.rotations[0].rotationDays).toEqual([8, 15, 22]);
    const shop = await shopRow(shopId);
    expect(shop.activeInventoryListId).toBe(listIds[0]); // 1 -> 2 -> 3 -> 1
    expect(shop.nextRefreshDay).toBe(29);
  });

  it("shops with intervals 3 and 7 rotate independently; single-list and empty shops do not fail", async () => {
    const fast = await shopWithLists("Schnell", 3, 3);
    const slow = await shopWithLists("Langsam", 7, 3);
    const single = await shopWithLists("Eine Liste", 2, 1);
    const empty = await shopWithLists("Leer", 2, 0);

    await advance(6, 1); // day 7
    expect(await shopRow(fast.shopId)).toMatchObject({ activeInventoryListId: fast.listIds[2], nextRefreshDay: 10 });
    expect(await shopRow(slow.shopId)).toMatchObject({ activeInventoryListId: slow.listIds[0], nextRefreshDay: 8 });
    expect(await shopRow(single.shopId)).toMatchObject({ activeInventoryListId: single.listIds[0], nextRefreshDay: 9 });
    expect(await shopRow(empty.shopId)).toMatchObject({ activeInventoryListId: null, nextRefreshDay: 9 });

    const emptyView = await getShopForPlayer(db, campaignId, empty.shopId);
    expect(emptyView?.entries).toEqual([]);
  });

  it("writes day counter, rotations and audit events atomically", async () => {
    await shopWithLists("Krämer", 7, 3);
    await advance(7, 1);
    const events = await db.select().from(campaignEvents).where(eq(campaignEvents.campaignId, campaignId));
    const types = events.map((e) => e.eventType);
    expect(types.filter((t) => t === "day_advanced")).toHaveLength(1);
    expect(types.filter((t) => t === "shop_rotated_scheduled")).toHaveLength(1);
    const advanced = events.find((e) => e.eventType === "day_advanced")!;
    expect(advanced.beforeJson).toEqual({ currentDay: 1 });
    expect(advanced.afterJson).toMatchObject({ currentDay: 8, days: 7 });
    expect(advanced.actorRole).toBe("admin");
  });

  it("rolls everything back when the transaction fails midway", async () => {
    const { shopId, listIds } = await shopWithLists("Krämer", 7, 3);
    // Make the LAST write of the transaction (the day_advanced audit event) fail,
    // i.e. after the shop rows and the day counter were already updated.
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION test_fail_day_event() RETURNS trigger AS $$
      BEGIN
        IF NEW.event_type = 'day_advanced' THEN RAISE EXCEPTION 'simulated failure'; END IF;
        RETURN NEW;
      END $$ LANGUAGE plpgsql`);
    await db.execute(sql`CREATE TRIGGER test_fail_day_event BEFORE INSERT ON campaign_events FOR EACH ROW EXECUTE FUNCTION test_fail_day_event()`);
    try {
      await expect(advance(7, 1)).rejects.toThrow();
    } finally {
      await db.execute(sql`DROP TRIGGER test_fail_day_event ON campaign_events`);
      await db.execute(sql`DROP FUNCTION test_fail_day_event()`);
    }
    expect(await day(campaignId)).toBe(1);
    expect(await shopRow(shopId)).toMatchObject({ activeInventoryListId: listIds[0], nextRefreshDay: 8 });
    const events = await db.select().from(campaignEvents).where(eq(campaignEvents.campaignId, campaignId));
    expect(events.some((e) => e.eventType === "shop_rotated_scheduled")).toBe(false);
    // And it works again afterwards.
    await advance(7, 1);
    expect(await day(campaignId)).toBe(8);
  });

  it("a duplicated request (same expected day) is applied exactly once", async () => {
    const { shopId, listIds } = await shopWithLists("Krämer", 7, 3);
    await advance(7, 1);
    await expect(advance(7, 1)).rejects.toBeInstanceOf(ConflictError);
    expect(await day(campaignId)).toBe(8);
    expect(await shopRow(shopId)).toMatchObject({ activeInventoryListId: listIds[1], nextRefreshDay: 15 });
  });

  it("simultaneous day advances: exactly one wins, no double rotation", async () => {
    const { shopId, listIds } = await shopWithLists("Krämer", 7, 3);
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => advance(7, 1)));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    for (const r of results) {
      if (r.status === "rejected") expect(r.reason).toBeInstanceOf(ConflictError);
    }
    expect(await day(campaignId)).toBe(8);
    expect(await shopRow(shopId)).toMatchObject({ activeInventoryListId: listIds[1], nextRefreshDay: 15 });
    const events = await db.select().from(campaignEvents).where(eq(campaignEvents.campaignId, campaignId));
    expect(events.filter((e) => e.eventType === "day_advanced")).toHaveLength(1);
    expect(events.filter((e) => e.eventType === "shop_rotated_scheduled")).toHaveLength(1);
  });

  it("other campaigns' day counters and shops remain unchanged", async () => {
    const otherId = await newCampaign("beta", 40);
    const other = await shopWithLists("Fremd", 1, 2, otherId);
    await shopWithLists("Krämer", 7, 3);
    await advance(30, 1);
    expect(await day(campaignId)).toBe(31);
    expect(await day(otherId)).toBe(40);
    expect(await shopRow(other.shopId)).toMatchObject({ activeInventoryListId: other.listIds[0], nextRefreshDay: 41 });
  });

  it("only moves forward by a positive whole number of days", async () => {
    for (const bad of [0, -1, 1.5, 100_000]) {
      await expect(advance(bad, 1)).rejects.toThrow();
    }
    expect(await day(campaignId)).toBe(1);
  });

  it("manual rotation advances exactly one list and keeps nextRefreshDay", async () => {
    const { shopId, listIds } = await shopWithLists("Krämer", 7, 3);
    await rotateShopManually(db, shopId, listIds[0], "admin");
    expect(await shopRow(shopId)).toMatchObject({ activeInventoryListId: listIds[1], nextRefreshDay: 8 });
    // Stale/duplicate click is rejected, not applied twice.
    await expect(rotateShopManually(db, shopId, listIds[0], "admin")).rejects.toBeInstanceOf(ConflictError);
    // Simultaneous clicks: one wins.
    const results = await Promise.allSettled(Array.from({ length: 5 }, () => rotateShopManually(db, shopId, listIds[1], "admin")));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await shopRow(shopId)).toMatchObject({ activeInventoryListId: listIds[2], nextRefreshDay: 8 });
    // The schedule continues from the manually selected list.
    await advance(7, 1);
    expect(await shopRow(shopId)).toMatchObject({ activeInventoryListId: listIds[0], nextRefreshDay: 15 });
  });

  it("changing the interval reschedules from the current campaign day; other edits do not", async () => {
    const { shopId } = await shopWithLists("Krämer", 7, 2);
    await advance(4, 1); // day 5
    await updateShop(db, shopId, { ...shopInput("Krämer neu", 7) }, "admin");
    expect((await shopRow(shopId)).nextRefreshDay).toBe(8);
    await updateShop(db, shopId, shopInput("Krämer neu", 3), "admin");
    expect((await shopRow(shopId)).nextRefreshDay).toBe(8); // 5 + 3
    await updateShop(db, shopId, shopInput("Krämer neu", 10), "admin");
    expect((await shopRow(shopId)).nextRefreshDay).toBe(15); // 5 + 10
  });

  it("reordering keeps the active list; deleting the active list picks the following one", async () => {
    const { shopId, listIds } = await shopWithLists("Krämer", 7, 3);
    const [a, b, c] = listIds;
    await moveInventoryList(db, a, "down"); // b, a, c
    await moveInventoryList(db, a, "down"); // b, c, a
    await moveInventoryList(db, a, "down"); // no-op at the end
    let view = (await getShopForAdmin(db, shopId))!;
    expect(view.lists.map((l) => l.id)).toEqual([b, c, a]);
    expect(view.lists.map((l) => l.sortOrder)).toEqual([0, 1, 2]);
    expect(view.shop.activeInventoryListId).toBe(a);

    await deleteInventoryList(db, a); // active was last -> wraps to first (b)
    view = (await getShopForAdmin(db, shopId))!;
    expect(view.lists.map((l) => l.id)).toEqual([b, c]);
    expect(view.lists.map((l) => l.sortOrder)).toEqual([0, 1]);
    expect(view.shop.activeInventoryListId).toBe(b);

    await deleteInventoryList(db, c); // not active -> active unchanged
    expect((await shopRow(shopId)).activeInventoryListId).toBe(b);
    await deleteInventoryList(db, b);
    expect((await shopRow(shopId)).activeInventoryListId).toBeNull();
    // Rotation still works with zero lists.
    await advance(10, 1);
    expect(await shopRow(shopId)).toMatchObject({ activeInventoryListId: null, nextRefreshDay: 15 });
  });

  it("players only get the active list of visible shops, without admin-only fields", async () => {
    const { shopId, listIds } = await shopWithLists("Krämer", 7, 2);
    const hidden = await createShop(db, campaignId, shopInput("Versteckt", 5, false), "admin");
    const potion = await createItem(db, campaignId, itemInput("Heiltrank", 5000));
    const sword = await createItem(db, campaignId, itemInput("Schwert", 1500));
    await addItemToList(db, listIds[0], { itemId: potion, quantity: 3, priceOverrideCopper: null });
    await addItemToList(db, listIds[1], { itemId: sword, quantity: 1, priceOverrideCopper: 999 });
    await addItemToList(db, listIds[1], { itemId: potion, quantity: 9, priceOverrideCopper: null });

    const view = (await getShopForPlayer(db, campaignId, shopId))!;
    expect(view.entries.map((e) => e.name)).toEqual(["Heiltrank"]);
    expect(view.entries[0]).toMatchObject({ quantity: 3, priceCopper: 5000 });
    expect(JSON.stringify(view)).not.toContain("GEHEIM");
    expect(JSON.stringify(view)).not.toContain("Schwert");

    expect(await getShopForPlayer(db, campaignId, hidden)).toBeNull();
    expect((await listShops(db, campaignId, { onlyVisible: true })).map((s) => s.name)).toEqual(["Krämer"]);
    // A shop id from another campaign is not readable through this campaign.
    const otherId = await newCampaign("beta");
    expect(await getShopForPlayer(db, otherId, shopId)).toBeNull();

    // After rotation the second list (with per-list quantity and price override) is shown.
    await rotateShopManually(db, shopId, listIds[0], "admin");
    const rotated = (await getShopForPlayer(db, campaignId, shopId))!;
    expect(rotated.entries.map((e) => [e.name, e.quantity, e.priceCopper])).toEqual([
      ["Schwert", 1, 999],
      ["Heiltrank", 9, 5000],
    ]);
  });

  it("orders, reorders and removes list entries with gap-free positions", async () => {
    const { listIds, shopId } = await shopWithLists("Krämer", 7, 1);
    const ids: string[] = [];
    for (const name of ["A", "B", "C"]) {
      const itemId = await createItem(db, campaignId, itemInput(name));
      ids.push(await addItemToList(db, listIds[0], { itemId, quantity: 1, priceOverrideCopper: null }));
    }
    await moveListItem(db, ids[2], "up");
    await moveListItem(db, ids[2], "up");
    await moveListItem(db, ids[2], "up"); // no-op at the top
    const names = async () => (await getShopForAdmin(db, shopId))!.lists[0].entries.map((e) => `${e.sortOrder}:${e.name}`);
    expect(await names()).toEqual(["0:C", "1:A", "2:B"]);
    await removeListItem(db, ids[0]);
    expect(await names()).toEqual(["0:C", "1:B"]);
  });

  it("rejects duplicates and cross-campaign items in a list (service and schema level)", async () => {
    const { listIds } = await shopWithLists("Krämer", 7, 1);
    const own = await createItem(db, campaignId, itemInput("Eigen"));
    const otherCampaign = await newCampaign("beta");
    const foreign = await createItem(db, otherCampaign, itemInput("Fremd"));

    await addItemToList(db, listIds[0], { itemId: own, quantity: 1, priceOverrideCopper: null });
    await expect(addItemToList(db, listIds[0], { itemId: own, quantity: 1, priceOverrideCopper: null })).rejects.toThrow(/bereits/);
    await expect(addItemToList(db, listIds[0], { itemId: foreign, quantity: 1, priceOverrideCopper: null })).rejects.toThrow(/Kampagne/);

    // Bypass the service: the composite foreign keys must still refuse it.
    await expect(
      db.insert(inventoryListItems).values({ inventoryListId: listIds[0], itemId: foreign, campaignId, quantity: 1, sortOrder: 5 }),
    ).rejects.toThrow();
    await expect(
      db.insert(inventoryListItems).values({ inventoryListId: listIds[0], itemId: foreign, campaignId: otherCampaign, quantity: 1, sortOrder: 5 }),
    ).rejects.toThrow();
  });

  it("schema enforces: active list belongs to the shop, positive interval, non-negative day/price/quantity, unique positions", async () => {
    const a = await shopWithLists("A", 7, 1);
    const b = await shopWithLists("B", 7, 1);
    await expect(db.update(shops).set({ activeInventoryListId: b.listIds[0] }).where(eq(shops.id, a.shopId))).rejects.toThrow();
    await expect(db.update(shops).set({ refreshIntervalDays: 0 }).where(eq(shops.id, a.shopId))).rejects.toThrow();
    await expect(db.update(campaigns).set({ currentDay: -1 }).where(eq(campaigns.id, campaignId))).rejects.toThrow();
    await expect(db.insert(items).values({ campaignId, name: "x", basePriceCopper: -5 })).rejects.toThrow();
    await expect(
      db.insert(inventoryLists).values({ shopId: a.shopId, campaignId, name: "dup", sortOrder: 0 }),
    ).rejects.toThrow();
    await expect(db.insert(campaigns).values({ name: "dup", slug: "alpha" })).rejects.toThrow();
  });

  it("cascades: deleting an item removes its entries, deleting a campaign removes everything", async () => {
    const { shopId, listIds } = await shopWithLists("Krämer", 7, 2);
    const potion = await createItem(db, campaignId, itemInput("Heiltrank"));
    await addItemToList(db, listIds[0], { itemId: potion, quantity: 3, priceOverrideCopper: null });
    await deleteItem(db, potion);
    expect((await getShopForAdmin(db, shopId))!.lists[0].entries).toEqual([]);

    await deleteCampaign(db, campaignId);
    expect(await db.select().from(shops)).toEqual([]);
    expect(await db.select().from(inventoryLists)).toEqual([]);
    expect(await db.select().from(campaignEvents)).toEqual([]);
  });

  it("preview is read-only and matches what advancing actually does; export contains the campaign", async () => {
    const { shopId } = await shopWithLists("Krämer", 7, 3);
    const preview = await getRotationPreview(db, campaignId, 1, [6, 7, 21]);
    expect(preview[0]).toMatchObject({ shopId, nextRefreshDay: 8, daysUntilRefresh: 7, activeListName: "Liste 1" });
    expect(preview[0].whatIf).toEqual([
      { days: 6, rotationsDue: 0, toListName: "Liste 1" },
      { days: 7, rotationsDue: 1, toListName: "Liste 2" },
      { days: 21, rotationsDue: 3, toListName: "Liste 1" },
    ]);
    expect((await shopRow(shopId)).nextRefreshDay).toBe(8);

    const exported = (await exportCampaign(db, campaignId))!;
    expect(exported.campaign.slug).toBe("alpha");
    expect(exported.shops[0].inventoryLists).toHaveLength(3);
  });
});
