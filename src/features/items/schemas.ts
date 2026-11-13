import { z } from "zod";
import { ITEM_CATEGORIES, MAX_PRICE_COPPER, RARITIES } from "@/lib/constants";
import { CURRENCIES, parsePriceToCopper, type Currency } from "@/lib/money";
import { optionalAssetPath, requiredText, text } from "@/lib/validation";

/**
 * Validates "amount + currency" form input and converts it to integer copper.
 * Adds issues to the given field when the amount is not representable.
 */
export function priceToCopper(
  amount: string,
  currency: Currency,
  ctx: z.RefinementCtx,
  path: string,
): number {
  const copper = parsePriceToCopper(amount, currency);
  if (copper === null) {
    ctx.addIssue({
      code: "custom",
      path: [path],
      message: "Bitte einen gültigen Preis angeben (z. B. 12 oder 2,5), der in ganzen Kupfermünzen aufgeht.",
    });
    return 0;
  }
  if (copper > MAX_PRICE_COPPER) {
    ctx.addIssue({ code: "custom", path: [path], message: "Der Preis ist zu hoch." });
    return 0;
  }
  return copper;
}

export const itemInputSchema = z
  .object({
    name: requiredText(120, "Der Name"),
    description: text(4000, "Die Beschreibung"),
    category: z.enum(ITEM_CATEGORIES, "Unbekannte Kategorie."),
    rarity: z.enum(RARITIES, "Unbekannte Seltenheit."),
    imagePath: optionalAssetPath,
    priceAmount: z.string().trim().min(1, "Bitte einen Preis angeben (0 für kostenlos)."),
    priceCurrency: z.enum(CURRENCIES, "Unbekannte Währung."),
    properties: text(2000, "Die Eigenschaften"),
    dmNotes: text(2000, "Die Notizen"),
  })
  .transform((v, ctx) => {
    const { priceAmount, priceCurrency, ...rest } = v;
    return {
      ...rest,
      basePriceCopper: priceToCopper(priceAmount, priceCurrency, ctx, "priceAmount"),
      displayCurrency: priceCurrency,
    };
  });
export type ItemInput = z.infer<typeof itemInputSchema>;
