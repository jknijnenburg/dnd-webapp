import { ASSET_CATALOG } from "./asset-catalog.generated";
import type { ItemCategory } from "./constants";

export type AssetKind = "items" | "shops" | "backgrounds" | "covers";

/**
 * Only relative paths below /images are accepted (no uploads, no external URLs).
 * Files in public/ are world-readable by URL – never put confidential material there.
 */
const ASSET_PATH_RE = /^\/images\/[a-z0-9][a-z0-9/_-]*\.(svg|png|jpe?g|webp|avif)$/;

export function isAllowedAssetPath(value: string): boolean {
  return value.length <= 200 && ASSET_PATH_RE.test(value) && !value.includes("//");
}

export function listAssets(kind: AssetKind): readonly string[] {
  return ASSET_CATALOG[kind];
}

export function assetLabel(path: string): string {
  const file = path.split("/").pop() ?? path;
  const base = file.replace(/\.[a-z]+$/, "").replace(/[-_]+/g, " ");
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export const FALLBACK_ITEM_IMAGE = "/images/items/fallback.svg";
export const FALLBACK_SHOP_IMAGE = "/images/shops/fallback.svg";
export const FALLBACK_COVER_IMAGE = "/images/covers/fallback.svg";

const CATEGORY_IMAGES: Record<ItemCategory, string> = {
  weapon: "/images/items/weapon.svg",
  armor: "/images/items/armor.svg",
  potion: "/images/items/potion.svg",
  scroll: "/images/items/scroll.svg",
  ring: "/images/items/ring.svg",
  wand: "/images/items/wand.svg",
  wondrous: "/images/items/wondrous.svg",
  gear: "/images/items/gear.svg",
  other: FALLBACK_ITEM_IMAGE,
};

export function itemImage(imagePath: string | null, category: string): string {
  if (imagePath && isAllowedAssetPath(imagePath)) return imagePath;
  return CATEGORY_IMAGES[category as ItemCategory] ?? FALLBACK_ITEM_IMAGE;
}

export function shopImage(imagePath: string | null): string {
  return imagePath && isAllowedAssetPath(imagePath) ? imagePath : FALLBACK_SHOP_IMAGE;
}

export function coverImage(imagePath: string | null): string {
  return imagePath && isAllowedAssetPath(imagePath) ? imagePath : FALLBACK_COVER_IMAGE;
}
