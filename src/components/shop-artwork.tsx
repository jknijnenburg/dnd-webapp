/* eslint-disable @next/next/no-img-element -- custom local artwork retains its original aspect ratio */
import { FALLBACK_SHOP_IMAGE, isAllowedAssetPath, shopImage } from "@/lib/assets";
import { cn } from "@/lib/utils";

const STOCK_SHOP_IMAGE = /^\/images\/shops\/(alchemist|blacksmith|bookshop|curio|general-store|fallback)\.svg$/;

/** Original shop choices become illustrated encounters; custom artwork stays intact. */
export function ShopArtwork({ imagePath, category, className }: {
  imagePath: string | null;
  category: string | null;
  className?: string;
}) {
  const image = imagePath && isAllowedAssetPath(imagePath) ? imagePath : FALLBACK_SHOP_IMAGE;
  if (!STOCK_SHOP_IMAGE.test(image)) {
    return <img src={shopImage(image)} alt="" className={className} />;
  }
  const kind = `${image} ${category ?? ""}`;
  const scene = /blacksmith|schmied|waffen/i.test(kind) ? "forge" : /alchem|potion|trank/i.test(kind) ? "alchemist" : "curio";
  return <span className={cn("game-shop-sprite", className)} data-scene={scene} aria-hidden />;
}
