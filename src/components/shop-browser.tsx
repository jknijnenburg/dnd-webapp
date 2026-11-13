"use client";

import "./marketplace.css";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarClock, Search, Store, UserRound } from "lucide-react";
import { ShopArtwork } from "@/components/shop-artwork";
import { refreshLabel } from "@/lib/format";
import type { LayoutPreset } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Input, NativeSelect } from "@/components/ui/input";
import { EmptyState } from "@/components/misc";

export interface ShopBrowserItem {
  id: string;
  name: string;
  description: string;
  merchantName: string | null;
  category: string | null;
  imagePath: string | null;
  nextRefreshDay: number;
}

export function ShopBrowser({
  shops,
  slug,
  currentDay,
  layout,
}: {
  shops: ShopBrowserItem[];
  slug: string;
  currentDay: number;
  layout: LayoutPreset;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const categories = useMemo(
    () => [...new Set(shops.map((s) => s.category).filter((c): c is string => Boolean(c)))].sort((a, b) => a.localeCompare(b, "de")),
    [shops],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return shops.filter(
      (s) =>
        (!category || s.category === category) &&
        (!q || [s.name, s.merchantName ?? "", s.description, s.category ?? ""].some((v) => v.toLowerCase().includes(q))),
    );
  }, [shops, query, category]);

  return (
    <div className="game-market">
      <div className="market-filters mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Händler suchen …"
            aria-label="Händler suchen"
            className="pl-9"
          />
        </div>
        {categories.length > 0 && (
          <NativeSelect value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Nach Kategorie filtern" className="sm:w-56">
            <option value="">Alle Kategorien</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </NativeSelect>
        )}
      </div>

      <p className="sr-only" role="status">
        {filtered.length} Händler gefunden
      </p>

      {filtered.length === 0 ? (
        <EmptyState icon={<Store />} title="Keine Händler gefunden" description="Kein Händler passt zu deiner Suche." />
      ) : layout === "compact" ? (
        <ul className="fantasy-panel divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface/95">
          {filtered.map((shop) => (
            <li key={shop.id}>
              <Link href={`/campaigns/${slug}/shops/${shop.id}`} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-2">
                <ShopArtwork imagePath={shop.imagePath} category={shop.category} className="size-12 shrink-0 rounded-md border border-border object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-display text-lg font-semibold">{shop.name}</span>
                    {shop.category && <Badge variant="muted">{shop.category}</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-x-4 text-sm text-muted">
                    {shop.merchantName && <span>{shop.merchantName}</span>}
                    <span>{refreshLabel(shop.nextRefreshDay, currentDay)}</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="merchant-roster grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((shop) => (
            <li key={shop.id}>
              <Link
                href={`/campaigns/${slug}/shops/${shop.id}`}
                className="shop-card group flex h-full flex-col"
              >
                <div className="shop-scene">
                  <ShopArtwork imagePath={shop.imagePath} category={shop.category} className="shop-art w-full object-cover" />
                  <span className="shop-scene-sigil" aria-hidden><Store /></span>
                  {shop.category && <span className="shop-category-ribbon">{shop.category}</span>}
                </div>
                <div className="shop-story flex flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="text-lg font-semibold group-hover:text-primary">{shop.name}</h2>
                  </div>
                  {shop.merchantName && (
                    <p className="flex items-center gap-1.5 text-sm text-muted">
                      <UserRound className="size-3.5" aria-hidden />
                      {shop.merchantName}
                    </p>
                  )}
                  {shop.description && <p className="line-clamp-3 text-sm text-muted">{shop.description}</p>}
                  <p className="mt-auto flex items-center gap-1.5 pt-2 text-sm text-primary">
                    <CalendarClock className="size-3.5" aria-hidden />
                    {refreshLabel(shop.nextRefreshDay, currentDay)}
                  </p>
                  <span className="shop-enter">Zum Sortiment <ArrowUpRight className="size-4" aria-hidden /></span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
