CREATE TABLE "campaign_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"actor_role" text NOT NULL,
	"event_type" text NOT NULL,
	"before_json" jsonb,
	"after_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_themes" (
	"campaign_id" uuid PRIMARY KEY NOT NULL,
	"primary_color" text NOT NULL,
	"secondary_color" text NOT NULL,
	"accent_color" text NOT NULL,
	"background_color" text NOT NULL,
	"font_preset" text DEFAULT 'classic' NOT NULL,
	"background_image_path" text,
	"layout_preset" text DEFAULT 'cards' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_themes_colors_hex" CHECK ("campaign_themes"."primary_color" ~ '^#[0-9a-fA-F]{6}$' AND "campaign_themes"."secondary_color" ~ '^#[0-9a-fA-F]{6}$' AND "campaign_themes"."accent_color" ~ '^#[0-9a-fA-F]{6}$' AND "campaign_themes"."background_color" ~ '^#[0-9a-fA-F]{6}$')
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"current_day" integer DEFAULT 1 NOT NULL,
	"cover_image_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaigns_slug_unique" UNIQUE("slug"),
	CONSTRAINT "campaigns_current_day_nonnegative" CHECK ("campaigns"."current_day" >= 0)
);
--> statement-breakpoint
CREATE TABLE "inventory_list_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventory_list_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"price_override_copper" integer,
	"sort_order" integer NOT NULL,
	CONSTRAINT "inventory_list_items_list_item_unique" UNIQUE("inventory_list_id","item_id"),
	CONSTRAINT "inventory_list_items_quantity_nonnegative" CHECK ("inventory_list_items"."quantity" >= 0),
	CONSTRAINT "inventory_list_items_price_override_nonnegative" CHECK ("inventory_list_items"."price_override_copper" IS NULL OR "inventory_list_items"."price_override_copper" >= 0)
);
--> statement-breakpoint
CREATE TABLE "inventory_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_lists_id_campaign_unique" UNIQUE("id","campaign_id"),
	CONSTRAINT "inventory_lists_id_shop_unique" UNIQUE("id","shop_id"),
	CONSTRAINT "inventory_lists_sort_order_nonnegative" CHECK ("inventory_lists"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"rarity" text DEFAULT 'unknown' NOT NULL,
	"image_path" text,
	"base_price_copper" integer DEFAULT 0 NOT NULL,
	"display_currency" text DEFAULT 'gp' NOT NULL,
	"properties" text DEFAULT '' NOT NULL,
	"dm_notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "items_id_campaign_unique" UNIQUE("id","campaign_id"),
	CONSTRAINT "items_base_price_nonnegative" CHECK ("items"."base_price_copper" >= 0),
	CONSTRAINT "items_display_currency_valid" CHECK ("items"."display_currency" IN ('cp','sp','ep','gp','pp'))
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"ip_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"merchant_name" text,
	"category" text,
	"image_path" text,
	"refresh_interval_days" integer NOT NULL,
	"next_refresh_day" integer NOT NULL,
	"active_inventory_list_id" uuid,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shops_id_campaign_unique" UNIQUE("id","campaign_id"),
	CONSTRAINT "shops_refresh_interval_positive" CHECK ("shops"."refresh_interval_days" > 0),
	CONSTRAINT "shops_next_refresh_day_nonnegative" CHECK ("shops"."next_refresh_day" >= 0)
);
--> statement-breakpoint
ALTER TABLE "campaign_events" ADD CONSTRAINT "campaign_events_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_themes" ADD CONSTRAINT "campaign_themes_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_list_items" ADD CONSTRAINT "inventory_list_items_list_campaign_fk" FOREIGN KEY ("inventory_list_id","campaign_id") REFERENCES "public"."inventory_lists"("id","campaign_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_list_items" ADD CONSTRAINT "inventory_list_items_item_campaign_fk" FOREIGN KEY ("item_id","campaign_id") REFERENCES "public"."items"("id","campaign_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_lists" ADD CONSTRAINT "inventory_lists_shop_campaign_fk" FOREIGN KEY ("shop_id","campaign_id") REFERENCES "public"."shops"("id","campaign_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shops" ADD CONSTRAINT "shops_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaign_events_campaign_created_idx" ON "campaign_events" USING btree ("campaign_id","created_at");--> statement-breakpoint
CREATE INDEX "inventory_list_items_list_idx" ON "inventory_list_items" USING btree ("inventory_list_id","sort_order");--> statement-breakpoint
CREATE INDEX "inventory_list_items_item_idx" ON "inventory_list_items" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "inventory_lists_shop_idx" ON "inventory_lists" USING btree ("shop_id","sort_order");--> statement-breakpoint
CREATE INDEX "items_campaign_name_idx" ON "items" USING btree ("campaign_id","name");--> statement-breakpoint
CREATE INDEX "login_attempts_lookup_idx" ON "login_attempts" USING btree ("scope","ip_hash","created_at");--> statement-breakpoint
CREATE INDEX "login_attempts_created_idx" ON "login_attempts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "shops_campaign_idx" ON "shops" USING btree ("campaign_id","name");