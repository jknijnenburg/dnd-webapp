import { and, asc, count, eq, inArray, max } from "drizzle-orm";
import type { Db, DbOrTx, Tx } from "@/lib/db";
import { isUniqueViolation, lockCampaign, lockShop, recordEvent } from "@/lib/db/helpers";
import { campaigns, inventoryListItems, inventoryLists, items, shops } from "@/lib/db/schema";
import { ConflictError, NotFoundError, UserFacingError } from "@/lib/errors";
import {
  manualRotation,
  resolveActiveListAfterChange,
  scheduleFromDay,
} from "@/features/ingame-time/rotation";
import type { Direction, ListItemInput, ListItemUpdate, ShopInput } from "./schemas";

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

export interface ShopSummary {
  id: string;
  campaignId: string;
  name: string;
  description: string;
  merchantName: string | null;
  category: string | null;
  imagePath: string | null;
  refreshIntervalDays: number;
  nextRefreshDay: number;
  activeInventoryListId: string | null;
  isVisible: boolean;
}

const shopColumns = {
  id: shops.id,
  campaignId: shops.campaignId,
  name: shops.name,
  description: shops.description,
  merchantName: shops.merchantName,
  category: shops.category,
  imagePath: shops.imagePath,
  refreshIntervalDays: shops.refreshIntervalDays,
  nextRefreshDay: shops.nextRefreshDay,
  activeInventoryListId: shops.activeInventoryListId,
  isVisible: shops.isVisible,
};

export async function listShops(
  db: DbOrTx,
  campaignId: string,
  options: { onlyVisible: boolean },
): Promise<ShopSummary[]> {
  return db
    .select(shopColumns)
    .from(shops)
    .where(and(eq(shops.campaignId, campaignId), options.onlyVisible ? eq(shops.isVisible, true) : undefined))
    .orderBy(asc(shops.name), asc(shops.id));
}

/** Entry of an inventory list as players may see it (no admin-only fields). */
export interface ListEntry {
  entryId: string;
  itemId: string;
  name: string;
  description: string;
  category: string;
  rarity: string;
  imagePath: string | null;
  properties: string;
  quantity: number;
  /** Effective price: list-specific override or the item's base price. */
  priceCopper: number;
  basePriceCopper: number;
  priceOverrideCopper: number | null;
  displayCurrency: string;
  sortOrder: number;
}

async function loadEntries(db: DbOrTx, listIds: string[]): Promise<Map<string, ListEntry[]>> {
  const result = new Map<string, ListEntry[]>(listIds.map((id) => [id, []]));
  if (listIds.length === 0) return result;
  const rows = await db
    .select({
      listId: inventoryListItems.inventoryListId,
      entryId: inventoryListItems.id,
      itemId: items.id,
      name: items.name,
      description: items.description,
      category: items.category,
      rarity: items.rarity,
      imagePath: items.imagePath,
      properties: items.properties,
      quantity: inventoryListItems.quantity,
      basePriceCopper: items.basePriceCopper,
      priceOverrideCopper: inventoryListItems.priceOverrideCopper,
      displayCurrency: items.displayCurrency,
      sortOrder: inventoryListItems.sortOrder,
    })
    .from(inventoryListItems)
    .innerJoin(items, eq(items.id, inventoryListItems.itemId))
    .where(inArray(inventoryListItems.inventoryListId, listIds))
    .orderBy(asc(inventoryListItems.sortOrder));
  for (const { listId, ...entry } of rows) {
    result.get(listId)!.push({ ...entry, priceCopper: entry.priceOverrideCopper ?? entry.basePriceCopper });
  }
  return result;
}

export interface PlayerShopView {
  shop: ShopSummary;
  activeListName: string | null;
  entries: ListEntry[];
}

/**
 * Player view: only a visible shop of the given campaign, and only the
 * currently active inventory list. Prepared lists are never loaded here.
 */
export async function getShopForPlayer(
  db: DbOrTx,
  campaignId: string,
  shopId: string,
): Promise<PlayerShopView | null> {
  const [shop] = await db
    .select(shopColumns)
    .from(shops)
    .where(and(eq(shops.id, shopId), eq(shops.campaignId, campaignId), eq(shops.isVisible, true)))
    .limit(1);
  if (!shop) return null;
  if (!shop.activeInventoryListId) return { shop, activeListName: null, entries: [] };
  const [list] = await db
    .select({ id: inventoryLists.id, name: inventoryLists.name })
    .from(inventoryLists)
    .where(and(eq(inventoryLists.id, shop.activeInventoryListId), eq(inventoryLists.shopId, shop.id)))
    .limit(1);
  if (!list) return { shop, activeListName: null, entries: [] };
  const entries = await loadEntries(db, [list.id]);
  return { shop, activeListName: list.name, entries: entries.get(list.id) ?? [] };
}

export interface AdminListView {
  id: string;
  name: string;
  sortOrder: number;
  entries: ListEntry[];
}
export interface AdminShopView {
  shop: ShopSummary;
  campaign: { id: string; name: string; slug: string; currentDay: number };
  lists: AdminListView[];
}

export async function getShopForAdmin(db: DbOrTx, shopId: string): Promise<AdminShopView | null> {
  const [row] = await db
    .select({
      shop: shopColumns,
      campaign: { id: campaigns.id, name: campaigns.name, slug: campaigns.slug, currentDay: campaigns.currentDay },
    })
    .from(shops)
    .innerJoin(campaigns, eq(campaigns.id, shops.campaignId))
    .where(eq(shops.id, shopId))
    .limit(1);
  if (!row) return null;
  const lists = await db
    .select({ id: inventoryLists.id, name: inventoryLists.name, sortOrder: inventoryLists.sortOrder })
    .from(inventoryLists)
    .where(eq(inventoryLists.shopId, shopId))
    .orderBy(asc(inventoryLists.sortOrder));
  const entries = await loadEntries(db, lists.map((l) => l.id));
  return { ...row, lists: lists.map((l) => ({ ...l, entries: entries.get(l.id) ?? [] })) };
}

/** Ordered list ids per shop for a whole campaign (used by rotation + previews). */
export async function getListOrderByShop(db: DbOrTx, campaignId: string): Promise<Map<string, { id: string; name: string }[]>> {
  const rows = await db
    .select({ id: inventoryLists.id, shopId: inventoryLists.shopId, name: inventoryLists.name })
    .from(inventoryLists)
    .where(eq(inventoryLists.campaignId, campaignId))
    .orderBy(asc(inventoryLists.shopId), asc(inventoryLists.sortOrder));
  const map = new Map<string, { id: string; name: string }[]>();
  for (const row of rows) {
    if (!map.has(row.shopId)) map.set(row.shopId, []);
    map.get(row.shopId)!.push({ id: row.id, name: row.name });
  }
  return map;
}

export async function countListsByShop(db: DbOrTx, campaignId: string): Promise<Map<string, number>> {
  const rows = await db
    .select({ shopId: inventoryLists.shopId, n: count() })
    .from(inventoryLists)
    .where(eq(inventoryLists.campaignId, campaignId))
    .groupBy(inventoryLists.shopId);
  return new Map(rows.map((r) => [r.shopId, r.n]));
}

/* ------------------------------------------------------------------ */
/* Shop writes                                                         */
/* ------------------------------------------------------------------ */

export async function createShop(db: Db, campaignId: string, input: ShopInput, actorRole: string): Promise<string> {
  return db.transaction(async (tx) => {
    const campaign = await lockCampaign(tx, campaignId);
    const [created] = await tx
      .insert(shops)
      .values({
        campaignId,
        ...input,
        // Spec §6.4: the first refresh is scheduled relative to the current campaign day.
        nextRefreshDay: scheduleFromDay(campaign.currentDay, input.refreshIntervalDays),
      })
      .returning({ id: shops.id });
    await recordEvent(tx, {
      campaignId,
      actorRole,
      eventType: "shop_created",
      after: { shopId: created.id, name: input.name, refreshIntervalDays: input.refreshIntervalDays },
    });
    return created.id;
  });
}

export async function updateShop(db: Db, shopId: string, input: ShopInput, actorRole: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [ref] = await tx.select({ campaignId: shops.campaignId }).from(shops).where(eq(shops.id, shopId));
    if (!ref) throw new NotFoundError("Der Händler wurde nicht gefunden.");
    const campaign = await lockCampaign(tx, ref.campaignId);
    const shop = await lockShop(tx, shopId);
    const intervalChanged = shop.refreshIntervalDays !== input.refreshIntervalDays;
    // Spec §6.9: a changed interval restarts the schedule from the current campaign day.
    const nextRefreshDay = intervalChanged
      ? scheduleFromDay(campaign.currentDay, input.refreshIntervalDays)
      : shop.nextRefreshDay;
    await tx.update(shops).set({ ...input, nextRefreshDay }).where(eq(shops.id, shopId));
    if (intervalChanged) {
      await recordEvent(tx, {
        campaignId: shop.campaignId,
        actorRole,
        eventType: "shop_interval_changed",
        before: { shopId, refreshIntervalDays: shop.refreshIntervalDays, nextRefreshDay: shop.nextRefreshDay },
        after: { shopId, refreshIntervalDays: input.refreshIntervalDays, nextRefreshDay },
      });
    }
  });
}

export async function deleteShop(db: Db, shopId: string): Promise<void> {
  const deleted = await db.delete(shops).where(eq(shops.id, shopId)).returning({ id: shops.id });
  if (deleted.length === 0) throw new NotFoundError("Der Händler wurde nicht gefunden.");
}

/**
 * Manual rotation (spec §6.8): exactly one list forward, `nextRefreshDay` is
 * left untouched. `expectedActiveListId` is the list the admin saw when
 * clicking; a mismatch means a duplicate/concurrent request and is rejected.
 */
export async function rotateShopManually(
  db: Db,
  shopId: string,
  expectedActiveListId: string | null,
  actorRole: string,
): Promise<{ activeListId: string | null }> {
  return db.transaction(async (tx) => {
    const shop = await lockShop(tx, shopId);
    if (shop.activeInventoryListId !== expectedActiveListId) throw new ConflictError();
    const listIds = await orderedListIds(tx, shopId);
    if (listIds.length === 0) throw new UserFacingError("Dieser Händler hat noch keine Inventarlisten.");
    const next = manualRotation(listIds, shop.activeInventoryListId);
    await tx.update(shops).set({ activeInventoryListId: next }).where(eq(shops.id, shopId));
    await recordEvent(tx, {
      campaignId: shop.campaignId,
      actorRole,
      eventType: "shop_rotated_manual",
      before: { shopId, activeListId: shop.activeInventoryListId, nextRefreshDay: shop.nextRefreshDay },
      after: { shopId, activeListId: next, nextRefreshDay: shop.nextRefreshDay },
    });
    return { activeListId: next };
  });
}

/* ------------------------------------------------------------------ */
/* Inventory lists                                                     */
/* ------------------------------------------------------------------ */

async function orderedListIds(tx: Tx, shopId: string): Promise<string[]> {
  const rows = await tx
    .select({ id: inventoryLists.id })
    .from(inventoryLists)
    .where(eq(inventoryLists.shopId, shopId))
    .orderBy(asc(inventoryLists.sortOrder));
  return rows.map((r) => r.id);
}

/** Rewrites sort orders 0..n-1; the unique constraint is deferred until commit. */
async function writeListOrder(tx: Tx, ids: string[]): Promise<void> {
  for (const [index, id] of ids.entries()) {
    await tx.update(inventoryLists).set({ sortOrder: index }).where(eq(inventoryLists.id, id));
  }
}

async function getListRef(db: DbOrTx, listId: string) {
  const [list] = await db
    .select({ id: inventoryLists.id, shopId: inventoryLists.shopId, campaignId: inventoryLists.campaignId })
    .from(inventoryLists)
    .where(eq(inventoryLists.id, listId));
  if (!list) throw new NotFoundError("Die Inventarliste wurde nicht gefunden.");
  return list;
}

export async function createInventoryList(db: Db, shopId: string, name: string): Promise<string> {
  return db.transaction(async (tx) => {
    const shop = await lockShop(tx, shopId);
    const [{ last }] = await tx
      .select({ last: max(inventoryLists.sortOrder) })
      .from(inventoryLists)
      .where(eq(inventoryLists.shopId, shopId));
    const [created] = await tx
      .insert(inventoryLists)
      .values({ shopId, campaignId: shop.campaignId, name, sortOrder: last === null ? 0 : last + 1 })
      .returning({ id: inventoryLists.id });
    // The first list of a shop becomes the active one.
    if (shop.activeInventoryListId === null) {
      await tx.update(shops).set({ activeInventoryListId: created.id }).where(eq(shops.id, shopId));
    }
    return created.id;
  });
}

export async function renameInventoryList(db: Db, listId: string, name: string): Promise<void> {
  const updated = await db
    .update(inventoryLists)
    .set({ name })
    .where(eq(inventoryLists.id, listId))
    .returning({ id: inventoryLists.id });
  if (updated.length === 0) throw new NotFoundError("Die Inventarliste wurde nicht gefunden.");
}

/** Deletes a list; if it was active, the following list (wrapping) takes over. */
export async function deleteInventoryList(db: Db, listId: string): Promise<void> {
  const ref = await getListRef(db, listId);
  await db.transaction(async (tx) => {
    const shop = await lockShop(tx, ref.shopId);
    const before = await orderedListIds(tx, shop.id);
    if (!before.includes(listId)) throw new NotFoundError("Die Inventarliste wurde nicht gefunden.");
    const after = before.filter((id) => id !== listId);
    const nextActive = resolveActiveListAfterChange(before, after, shop.activeInventoryListId);
    await tx.update(shops).set({ activeInventoryListId: nextActive }).where(eq(shops.id, shop.id));
    await tx.delete(inventoryLists).where(eq(inventoryLists.id, listId));
    await writeListOrder(tx, after);
  });
}

/** Moves a list one position; the active list id is preserved (spec §6.10). */
export async function moveInventoryList(db: Db, listId: string, direction: Direction): Promise<void> {
  const ref = await getListRef(db, listId);
  await db.transaction(async (tx) => {
    await lockShop(tx, ref.shopId);
    const ids = await orderedListIds(tx, ref.shopId);
    const index = ids.indexOf(listId);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await writeListOrder(tx, ids);
  });
}

export async function setActiveInventoryList(db: Db, listId: string, actorRole: string): Promise<void> {
  const ref = await getListRef(db, listId);
  await db.transaction(async (tx) => {
    const shop = await lockShop(tx, ref.shopId);
    const ids = await orderedListIds(tx, shop.id);
    if (!ids.includes(listId)) throw new NotFoundError("Die Inventarliste wurde nicht gefunden.");
    if (shop.activeInventoryListId === listId) return;
    await tx.update(shops).set({ activeInventoryListId: listId }).where(eq(shops.id, shop.id));
    await recordEvent(tx, {
      campaignId: shop.campaignId,
      actorRole,
      eventType: "shop_active_list_set",
      before: { shopId: shop.id, activeListId: shop.activeInventoryListId },
      after: { shopId: shop.id, activeListId: listId },
    });
  });
}

/* ------------------------------------------------------------------ */
/* Inventory list items                                                */
/* ------------------------------------------------------------------ */

async function orderedEntryIds(tx: Tx, listId: string): Promise<string[]> {
  const rows = await tx
    .select({ id: inventoryListItems.id })
    .from(inventoryListItems)
    .where(eq(inventoryListItems.inventoryListId, listId))
    .orderBy(asc(inventoryListItems.sortOrder));
  return rows.map((r) => r.id);
}

async function writeEntryOrder(tx: Tx, ids: string[]): Promise<void> {
  for (const [index, id] of ids.entries()) {
    await tx.update(inventoryListItems).set({ sortOrder: index }).where(eq(inventoryListItems.id, id));
  }
}

export async function addItemToList(db: Db, listId: string, input: ListItemInput): Promise<string> {
  const ref = await getListRef(db, listId);
  try {
    return await db.transaction(async (tx) => {
      await lockShop(tx, ref.shopId);
      const [item] = await tx
        .select({ id: items.id, campaignId: items.campaignId })
        .from(items)
        .where(eq(items.id, input.itemId));
      // Validated here for a friendly message; the composite FKs enforce it regardless.
      if (!item || item.campaignId !== ref.campaignId) {
        throw new UserFacingError("Der Gegenstand gehört nicht zur Kampagne dieses Händlers.");
      }
      const [{ last }] = await tx
        .select({ last: max(inventoryListItems.sortOrder) })
        .from(inventoryListItems)
        .where(eq(inventoryListItems.inventoryListId, listId));
      const [created] = await tx
        .insert(inventoryListItems)
        .values({
          inventoryListId: listId,
          itemId: input.itemId,
          campaignId: ref.campaignId,
          quantity: input.quantity,
          priceOverrideCopper: input.priceOverrideCopper,
          sortOrder: last === null ? 0 : last + 1,
        })
        .returning({ id: inventoryListItems.id });
      return created.id;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new UserFacingError("Dieser Gegenstand ist bereits in der Liste. Bitte die Menge anpassen.");
    }
    throw error;
  }
}

async function getEntryRef(db: DbOrTx, entryId: string) {
  const [entry] = await db
    .select({ id: inventoryListItems.id, listId: inventoryListItems.inventoryListId, shopId: inventoryLists.shopId })
    .from(inventoryListItems)
    .innerJoin(inventoryLists, eq(inventoryLists.id, inventoryListItems.inventoryListId))
    .where(eq(inventoryListItems.id, entryId));
  if (!entry) throw new NotFoundError("Der Listeneintrag wurde nicht gefunden.");
  return entry;
}

export async function updateListItem(db: Db, entryId: string, input: ListItemUpdate): Promise<void> {
  const updated = await db
    .update(inventoryListItems)
    .set(input)
    .where(eq(inventoryListItems.id, entryId))
    .returning({ id: inventoryListItems.id });
  if (updated.length === 0) throw new NotFoundError("Der Listeneintrag wurde nicht gefunden.");
}

export async function removeListItem(db: Db, entryId: string): Promise<void> {
  const ref = await getEntryRef(db, entryId);
  await db.transaction(async (tx) => {
    await lockShop(tx, ref.shopId);
    await tx.delete(inventoryListItems).where(eq(inventoryListItems.id, entryId));
    await writeEntryOrder(tx, await orderedEntryIds(tx, ref.listId));
  });
}

export async function moveListItem(db: Db, entryId: string, direction: Direction): Promise<void> {
  const ref = await getEntryRef(db, entryId);
  await db.transaction(async (tx) => {
    await lockShop(tx, ref.shopId);
    const ids = await orderedEntryIds(tx, ref.listId);
    const index = ids.indexOf(entryId);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await writeEntryOrder(tx, ids);
  });
}
