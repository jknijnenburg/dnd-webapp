import { z } from "zod";
import { FONT_PRESETS, LAYOUT_PRESETS, MAX_DAY } from "@/lib/constants";
import { intInRange, optionalAssetPath, requiredText, text } from "@/lib/validation";

const RESERVED_SLUGS = new Set(["new", "admin", "login", "api"]);

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Der URL-Slug braucht mindestens 2 Zeichen.")
  .max(60, "Der URL-Slug darf höchstens 60 Zeichen lang sein.")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Nur Kleinbuchstaben, Ziffern und Bindestriche (z. B. „asche-und-gold“).")
  .refine((s) => !RESERVED_SLUGS.has(s), "Dieser Slug ist reserviert.");

export const campaignInputSchema = z.object({
  name: requiredText(80, "Der Name"),
  slug: slugSchema,
  description: text(2000, "Die Beschreibung"),
  coverImagePath: optionalAssetPath,
});
export type CampaignInput = z.infer<typeof campaignInputSchema>;

export const campaignCreateSchema = campaignInputSchema.extend({
  startDay: intInRange(0, MAX_DAY, "Der Starttag"),
});
export type CampaignCreateInput = z.infer<typeof campaignCreateSchema>;

const hex = (label: string) =>
  z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, `${label}: bitte eine Farbe im Format #rrggbb angeben.`);

export const themeInputSchema = z.object({
  primaryColor: hex("Primärfarbe"),
  secondaryColor: hex("Sekundärfarbe"),
  accentColor: hex("Akzentfarbe"),
  backgroundColor: hex("Hintergrundfarbe"),
  fontPreset: z.enum(FONT_PRESETS, "Unbekannte Schriftart."),
  layoutPreset: z.enum(LAYOUT_PRESETS, "Unbekanntes Layout."),
  backgroundImagePath: optionalAssetPath,
});
export type ThemeInput = z.infer<typeof themeInputSchema>;
