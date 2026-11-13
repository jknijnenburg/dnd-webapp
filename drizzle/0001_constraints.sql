-- Constraints that Drizzle's schema DSL cannot express (requires PostgreSQL 15+).

-- The active inventory list must belong to the same shop. Deleting the list
-- clears only the pointer column (never the shop id).
ALTER TABLE "shops"
  ADD CONSTRAINT "shops_active_list_fk"
  FOREIGN KEY ("active_inventory_list_id", "id")
  REFERENCES "inventory_lists" ("id", "shop_id")
  ON DELETE SET NULL ("active_inventory_list_id");
--> statement-breakpoint

-- Unique positions per shop / per list. DEFERRABLE so that a reorder inside one
-- transaction may pass through temporarily duplicate positions.
ALTER TABLE "inventory_lists"
  ADD CONSTRAINT "inventory_lists_shop_sort_unique"
  UNIQUE ("shop_id", "sort_order") DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "inventory_list_items"
  ADD CONSTRAINT "inventory_list_items_list_sort_unique"
  UNIQUE ("inventory_list_id", "sort_order") DEFERRABLE INITIALLY DEFERRED;
