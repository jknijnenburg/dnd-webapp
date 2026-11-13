export const ITEM_CATEGORIES = [
  "weapon",
  "armor",
  "potion",
  "scroll",
  "ring",
  "wand",
  "wondrous",
  "gear",
  "other",
] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export const ITEM_CATEGORY_LABELS: Record<ItemCategory, string> = {
  weapon: "Waffe",
  armor: "Rüstung",
  potion: "Trank",
  scroll: "Schriftrolle",
  ring: "Ring",
  wand: "Zauberstab",
  wondrous: "Wundersamer Gegenstand",
  gear: "Ausrüstung",
  other: "Sonstiges",
};

export const RARITIES = [
  "common",
  "uncommon",
  "rare",
  "very_rare",
  "legendary",
  "artifact",
  "unknown",
] as const;
export type Rarity = (typeof RARITIES)[number];

export const RARITY_LABELS: Record<Rarity, string> = {
  common: "Gewöhnlich",
  uncommon: "Ungewöhnlich",
  rare: "Selten",
  very_rare: "Sehr selten",
  legendary: "Legendär",
  artifact: "Artefakt",
  unknown: "Unbekannt",
};

export const FONT_PRESETS = ["classic", "chronicle", "modern"] as const;
export type FontPreset = (typeof FONT_PRESETS)[number];
export const FONT_PRESET_LABELS: Record<FontPreset, string> = {
  classic: "Klassisch (Cinzel & Crimson)",
  chronicle: "Chronik (Cormorant & Crimson)",
  modern: "Modern (Inter)",
};

export const LAYOUT_PRESETS = ["cards", "compact"] as const;
export type LayoutPreset = (typeof LAYOUT_PRESETS)[number];
export const LAYOUT_PRESET_LABELS: Record<LayoutPreset, string> = {
  cards: "Karten",
  compact: "Kompakte Liste",
};

export const ACTOR_ROLES = ["admin", "system"] as const;

/** Hard limits that keep integer columns and jumps sane. */
export const MAX_DAY = 1_000_000;
export const MAX_ADVANCE_DAYS = 3650;
export const MAX_INTERVAL_DAYS = 3650;
export const MAX_PRICE_COPPER = 2_000_000_000;
export const MAX_QUANTITY = 1_000_000;
