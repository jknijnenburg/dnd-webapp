import { and, asc, count, eq, ilike, or } from "drizzle-orm";
import type { Db, DbOrTx } from "@/lib/db";
import { inventoryListItems, inventoryLists, items, shops } from "@/lib/db/schema";
import { NotFoundError } from "@/lib/errors";
import type { ItemInput } from "./schemas";

export interface ItemFilter {
  query?: string;
  category?: string;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function listItems(db: DbOrTx, campaignId: string, filter: ItemFilter = {}) {
  const q = filter.query?.trim();
  const pattern = q ? `%${escapeLike(q)}%` : null;
  return db
    .select()
    .from(items)
    .where(
      and(
        eq(items.campaignId, campaignId),
        filter.category ? eq(items.category, filter.category) : undefined,
        pattern ? or(ilike(items.name, pattern), ilike(items.description, pattern)) : undefined,
      ),
    )
    .orderBy(asc(items.name), asc(items.id));
}

export async function getItem(db: DbOrTx, id: string) {
  const [item] = await db.select().from(items).where(eq(items.id, id)).limit(1);
  return item ?? null;
}

/** Shops / lists that currently contain the item (shown before deleting). */
export async function getItemUsage(db: DbOrTx, itemId: string) {
  return db
    .select({ listId: inventoryLists.id, listName: inventoryLists.name, shopId: shops.id, shopName: shops.name })
    .from(inventoryListItems)
    .innerJoin(inventoryLists, eq(inventoryLists.id, inventoryListItems.inventoryListId))
    .innerJoin(shops, eq(shops.id, inventoryLists.shopId))
    .where(eq(inventoryListItems.itemId, itemId))
    .orderBy(asc(shops.name), asc(inventoryLists.sortOrder));
}

export async function countItemUsage(db: DbOrTx, campaignId: string): Promise<Map<string, number>> {
  const rows = await db
    .select({ itemId: inventoryListItems.itemId, n: count() })
    .from(inventoryListItems)
    .where(eq(inventoryListItems.campaignId, campaignId))
    .groupBy(inventoryListItems.itemId);
  return new Map(rows.map((r) => [r.itemId, r.n]));
}

export async function createItem(db: Db, campaignId: string, input: ItemInput): Promise<string> {
  const [created] = await db
    .insert(items)
    .values({ campaignId, ...input })
    .returning({ id: items.id });
  return created.id;
}

export async function updateItem(db: Db, id: string, input: ItemInput): Promise<void> {
  const updated = await db.update(items).set(input).where(eq(items.id, id)).returning({ id: items.id });
  if (updated.length === 0) throw new NotFoundError("Der Gegenstand wurde nicht gefunden.");
}

/** Removes the item from the library and (by cascade) from every inventory list. */
export async function deleteItem(db: Db, id: string): Promise<void> {
  const deleted = await db.delete(items).where(eq(items.id, id)).returning({ id: items.id });
  if (deleted.length === 0) throw new NotFoundError("Der Gegenstand wurde nicht gefunden.");
}
