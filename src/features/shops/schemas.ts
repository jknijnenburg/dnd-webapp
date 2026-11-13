import { z } from "zod";
import { MAX_INTERVAL_DAYS, MAX_QUANTITY } from "@/lib/constants";
import { CURRENCIES } from "@/lib/money";
import { priceToCopper } from "@/features/items/schemas";
import { idSchema, intInRange, optionalAssetPath, optionalText, requiredText, text } from "@/lib/validation";

export const shopInputSchema = z.object({
  name: requiredText(80, "Der Name"),
  description: text(2000, "Die Beschreibung"),
  merchantName: optionalText(80, "Der Händlername"),
  category: optionalText(40, "Die Kategorie"),
  imagePath: optionalAssetPath,
  refreshIntervalDays: intInRange(1, MAX_INTERVAL_DAYS, "Das Intervall"),
  isVisible: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true"),
});
export type ShopInput = z.infer<typeof shopInputSchema>;

export const listNameSchema = z.object({ name: requiredText(80, "Der Listenname") });

export const listItemInputSchema = z
  .object({
    itemId: idSchema,
    quantity: intInRange(0, MAX_QUANTITY, "Die Menge"),
    priceOverrideAmount: z.string().trim().default(""),
    priceOverrideCurrency: z.enum(CURRENCIES, "Unbekannte Währung.").default("gp"),
  })
  .transform((v, ctx) => ({
    itemId: v.itemId,
    quantity: v.quantity,
    priceOverrideCopper:
      v.priceOverrideAmount === ""
        ? null
        : priceToCopper(v.priceOverrideAmount, v.priceOverrideCurrency, ctx, "priceOverrideAmount"),
  }));
export type ListItemInput = z.infer<typeof listItemInputSchema>;

export const listItemUpdateSchema = z
  .object({
    quantity: intInRange(0, MAX_QUANTITY, "Die Menge"),
    priceOverrideAmount: z.string().trim().default(""),
    priceOverrideCurrency: z.enum(CURRENCIES, "Unbekannte Währung.").default("gp"),
  })
  .transform((v, ctx) => ({
    quantity: v.quantity,
    priceOverrideCopper:
      v.priceOverrideAmount === ""
        ? null
        : priceToCopper(v.priceOverrideAmount, v.priceOverrideCurrency, ctx, "priceOverrideAmount"),
  }));
export type ListItemUpdate = z.infer<typeof listItemUpdateSchema>;

export const directionSchema = z.enum(["up", "down"]);
export type Direction = z.infer<typeof directionSchema>;
