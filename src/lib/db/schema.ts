import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    currentDay: integer("current_day").notNull().default(1),
    coverImagePath: text("cover_image_path"),
    ...timestamps,
  },
  (t) => [check("campaigns_current_day_nonnegative", sql`${t.currentDay} >= 0`)],
);

export const campaignThemes = pgTable(
  "campaign_themes",
  {
    campaignId: uuid("campaign_id")
      .primaryKey()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    primaryColor: text("primary_color").notNull(),
    secondaryColor: text("secondary_color").notNull(),
    accentColor: text("accent_color").notNull(),
    backgroundColor: text("background_color").notNull(),
    fontPreset: text("font_preset").notNull().default("classic"),
    backgroundImagePath: text("background_image_path"),
    layoutPreset: text("layout_preset").notNull().default("cards"),
    ...timestamps,
  },
  (t) => [
    check(
      "campaign_themes_colors_hex",
      sql`${t.primaryColor} ~ '^#[0-9a-fA-F]{6}$' AND ${t.secondaryColor} ~ '^#[0-9a-fA-F]{6}$' AND ${t.accentColor} ~ '^#[0-9a-fA-F]{6}$' AND ${t.backgroundColor} ~ '^#[0-9a-fA-F]{6}$'`,
    ),
  ],
);

export const shops = pgTable(
  "shops",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    merchantName: text("merchant_name"),
    category: text("category"),
    imagePath: text("image_path"),
    refreshIntervalDays: integer("refresh_interval_days").notNull(),
    nextRefreshDay: integer("next_refresh_day").notNull(),
    /**
     * Composite FK (active_inventory_list_id, id) -> inventory_lists (id, shop_id)
     * with ON DELETE SET NULL (active_inventory_list_id) is added in the custom
     * migration 0001 (Drizzle cannot express the column-list SET NULL).
     */
    activeInventoryListId: uuid("active_inventory_list_id"),
    isVisible: boolean("is_visible").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    unique("shops_id_campaign_unique").on(t.id, t.campaignId),
    index("shops_campaign_idx").on(t.campaignId, t.name),
    check("shops_refresh_interval_positive", sql`${t.refreshIntervalDays} > 0`),
    check("shops_next_refresh_day_nonnegative", sql`${t.nextRefreshDay} >= 0`),
  ],
);

export const inventoryLists = pgTable(
  "inventory_lists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id").notNull(),
    /** Denormalised so that list items can be tied to the same campaign by FK. */
    campaignId: uuid("campaign_id").notNull(),
    name: text("name").notNull(),
    /** UNIQUE (shop_id, sort_order) DEFERRABLE is added in custom migration 0001. */
    sortOrder: integer("sort_order").notNull(),
    ...timestamps,
  },
  (t) => [
    foreignKey({
      name: "inventory_lists_shop_campaign_fk",
      columns: [t.shopId, t.campaignId],
      foreignColumns: [shops.id, shops.campaignId],
    }).onDelete("cascade"),
    unique("inventory_lists_id_campaign_unique").on(t.id, t.campaignId),
    unique("inventory_lists_id_shop_unique").on(t.id, t.shopId),
    index("inventory_lists_shop_idx").on(t.shopId, t.sortOrder),
    check("inventory_lists_sort_order_nonnegative", sql`${t.sortOrder} >= 0`),
  ],
);

export const items = pgTable(
  "items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    category: text("category").notNull().default("other"),
    rarity: text("rarity").notNull().default("unknown"),
    imagePath: text("image_path"),
    /** Canonical price in copper pieces (integer, never floating point). */
    basePriceCopper: integer("base_price_copper").notNull().default(0),
    /** Preferred denomination for display and editing only. */
    displayCurrency: text("display_currency").notNull().default("gp"),
    properties: text("properties").notNull().default(""),
    /** Admin-only notes; never selected by player queries. */
    dmNotes: text("dm_notes").notNull().default(""),
    ...timestamps,
  },
  (t) => [
    unique("items_id_campaign_unique").on(t.id, t.campaignId),
    index("items_campaign_name_idx").on(t.campaignId, t.name),
    check("items_base_price_nonnegative", sql`${t.basePriceCopper} >= 0`),
    check("items_display_currency_valid", sql`${t.displayCurrency} IN ('cp','sp','ep','gp','pp')`),
  ],
);

export const inventoryListItems = pgTable(
  "inventory_list_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inventoryListId: uuid("inventory_list_id").notNull(),
    itemId: uuid("item_id").notNull(),
    /** Shared by both composite FKs => item and list are always in the same campaign. */
    campaignId: uuid("campaign_id").notNull(),
    quantity: integer("quantity").notNull().default(1),
    priceOverrideCopper: integer("price_override_copper"),
    /** UNIQUE (inventory_list_id, sort_order) DEFERRABLE is added in custom migration 0001. */
    sortOrder: integer("sort_order").notNull(),
  },
  (t) => [
    foreignKey({
      name: "inventory_list_items_list_campaign_fk",
      columns: [t.inventoryListId, t.campaignId],
      foreignColumns: [inventoryLists.id, inventoryLists.campaignId],
    }).onDelete("cascade"),
    foreignKey({
      name: "inventory_list_items_item_campaign_fk",
      columns: [t.itemId, t.campaignId],
      foreignColumns: [items.id, items.campaignId],
    }).onDelete("cascade"),
    unique("inventory_list_items_list_item_unique").on(t.inventoryListId, t.itemId),
    index("inventory_list_items_list_idx").on(t.inventoryListId, t.sortOrder),
    index("inventory_list_items_item_idx").on(t.itemId),
    check("inventory_list_items_quantity_nonnegative", sql`${t.quantity} >= 0`),
    check(
      "inventory_list_items_price_override_nonnegative",
      sql`${t.priceOverrideCopper} IS NULL OR ${t.priceOverrideCopper} >= 0`,
    ),
  ],
);

export const campaignEvents = pgTable(
  "campaign_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    actorRole: text("actor_role").notNull(),
    eventType: text("event_type").notNull(),
    beforeJson: jsonb("before_json"),
    afterJson: jsonb("after_json"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("campaign_events_campaign_created_idx").on(t.campaignId, t.createdAt)],
);

/** Failed login attempts only (serverless-safe rate limiting); rows are pruned after 24h. */
export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    scope: text("scope").notNull(),
    /** HMAC of the client IP – the raw address is never stored. */
    ipHash: text("ip_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("login_attempts_lookup_idx").on(t.scope, t.ipHash, t.createdAt),
    index("login_attempts_created_idx").on(t.createdAt),
  ],
);

export type Campaign = typeof campaigns.$inferSelect;
export type CampaignTheme = typeof campaignThemes.$inferSelect;
export type Shop = typeof shops.$inferSelect;
export type InventoryList = typeof inventoryLists.$inferSelect;
export type Item = typeof items.$inferSelect;
export type InventoryListItem = typeof inventoryListItems.$inferSelect;
export type CampaignEvent = typeof campaignEvents.$inferSelect;
