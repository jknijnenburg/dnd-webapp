"use client";

/* eslint-disable @next/next/no-img-element -- local illustration assets */
import "./marketplace.css";
import { useMemo, useState } from "react";
import { ChevronDown, Coins, PackageOpen, Search, Sparkles } from "lucide-react";
import { itemImage } from "@/lib/assets";
import { ITEM_CATEGORIES, ITEM_CATEGORY_LABELS, type ItemCategory, type LayoutPreset } from "@/lib/constants";
import { formatPrice, isCurrency } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState, RarityBadge } from "@/components/misc";

export interface ItemBrowserEntry {
  entryId: string;
  name: string;
  description: string;
  category: string;
  rarity: string;
  imagePath: string | null;
  properties: string;
  quantity: number;
  priceCopper: number;
  displayCurrency: string;
}

const categoryLabel = (category: string) => ITEM_CATEGORY_LABELS[category as ItemCategory] ?? "Sonstiges";
const price = (entry: ItemBrowserEntry) =>
  formatPrice(entry.priceCopper, isCurrency(entry.displayCurrency) ? entry.displayCurrency : "gp");

const STOCK_ITEM_IMAGE = /^\/images\/items\/(weapon|armor|potion|scroll|ring|wand|wondrous|gear|fallback)\.svg$/;

function ItemArtwork({ entry, className }: { entry: ItemBrowserEntry; className: string }) {
  if (entry.imagePath && !STOCK_ITEM_IMAGE.test(entry.imagePath)) {
    return <img src={itemImage(entry.imagePath, entry.category)} alt="" className={className} />;
  }
  const category = ITEM_CATEGORIES.some((value) => value === entry.category) ? entry.category : "other";
  return (
    <span className={cn("game-item-artwork", className)} aria-hidden>
      <span className="game-item-sprite" data-category={category} />
    </span>
  );
}

function Stock({ quantity }: { quantity: number }) {
  return quantity > 0 ? (
    <span className="text-sm text-muted">
      Vorrat: <span className="font-semibold text-foreground tabular-nums">{quantity}</span>
    </span>
  ) : (
    <Badge variant="destructive">Ausverkauft</Badge>
  );
}

/**
 * Item descriptions are rendered as plain text nodes (React escapes them);
 * line breaks are kept via CSS. No HTML from the database is ever injected.
 */
export function ItemBrowser({ entries, layout }: { entries: ItemBrowserEntry[]; layout: LayoutPreset }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const categories = useMemo(() => [...new Set(entries.map((e) => e.category))], [entries]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter(
      (e) =>
        (!category || e.category === category) &&
        (!q || [e.name, e.description, e.properties].some((v) => v.toLowerCase().includes(q))),
    );
  }, [entries, query, category]);

  return (
    <div className="game-inventory">
      <div className="market-filters mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ware suchen …"
            aria-label="Ware suchen"
            className="pl-9"
          />
        </div>
        <span className="inventory-count"><Sparkles className="size-4" aria-hidden /> {filtered.length} Waren</span>
      </div>
      {categories.length > 1 && (
        <div className="inventory-categories" role="group" aria-label="Nach Kategorie filtern">
          <button type="button" aria-pressed={category === ""} onClick={() => setCategory("")}>Alles</button>
          {categories.map((c) => (
            <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)}>
              {categoryLabel(c)}
            </button>
          ))}
        </div>
      )}

      <p className="sr-only" role="status">
        {filtered.length} Gegenstände gefunden
      </p>

      {filtered.length === 0 ? (
        <EmptyState icon={<PackageOpen />} title="Nichts gefunden" description="Keine Ware passt zu deiner Suche." />
      ) : layout === "compact" ? (
        <ul className="fantasy-panel divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface/95">
          {filtered.map((entry) => (
            <li key={entry.entryId} className={cn("px-4 py-3", entry.quantity === 0 && "opacity-70")}>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
                  <ItemArtwork entry={entry} className="size-10 shrink-0 rounded-md" />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold group-open:text-primary">{entry.name}</div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                      <span>{categoryLabel(entry.category)}</span>
                      <RarityBadge rarity={entry.rarity} />
                    </div>
                  </div>
                  <ChevronDown className="inventory-disclosure size-4 shrink-0 text-accent" aria-hidden />
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className="font-display font-semibold text-primary tabular-nums">{price(entry)}</span>
                    <Stock quantity={entry.quantity} />
                  </div>
                </summary>
                <div className="mt-3 space-y-2 pl-[3.25rem] text-[0.95rem]">
                  {entry.description ? <p className="prose-plain">{entry.description}</p> : <p className="text-muted">Keine Beschreibung.</p>}
                  {entry.properties && <p className="prose-plain text-sm text-muted">{entry.properties}</p>}
                </div>
              </details>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="inventory-grid grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((entry) => (
            <li
              key={entry.entryId}
              data-rarity={entry.rarity}
              className={cn("item-card flex flex-col", entry.quantity === 0 && "opacity-70")}
            >
              <div className="item-card-art">
                <span className="item-card-category">{categoryLabel(entry.category)}</span>
                <span className="item-card-spark" aria-hidden>✦</span>
                <ItemArtwork entry={entry} className="h-full w-full object-contain" />
              </div>
              <div className="item-card-heading">
                <h3 className="text-base font-bold leading-snug">{entry.name}</h3>
              </div>
              <div className="item-card-rarity"><RarityBadge rarity={entry.rarity} /></div>
              <div className="item-card-description">
                {entry.description && <p className="prose-plain text-[0.95rem]">{entry.description}</p>}
                {entry.properties && <p className="prose-plain mt-2 border-l-2 border-accent/50 pl-3 text-sm text-muted">{entry.properties}</p>}
              </div>
              <div className="item-card-price mt-auto flex items-center justify-between gap-3">
                <Stock quantity={entry.quantity} />
                <span className="item-coin-ribbon font-display text-lg font-bold tabular-nums"><Coins className="size-4" aria-hidden />{price(entry)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
