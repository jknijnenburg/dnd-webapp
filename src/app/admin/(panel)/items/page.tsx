/* eslint-disable @next/next/no-img-element -- local static SVG placeholders */
import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Map as MapIcon, Plus, Search, Swords } from "lucide-react";
import { itemImage } from "@/lib/assets";
import { requireAdminPage } from "@/lib/auth/session";
import { adminItemUsageCounts, adminListCampaigns, adminListItems } from "@/lib/dal/admin";
import { ITEM_CATEGORIES, ITEM_CATEGORY_LABELS, type ItemCategory } from "@/lib/constants";
import { formatPrice, isCurrency } from "@/lib/money";
import { CampaignPicker, pickCampaign } from "@/components/admin/campaign-picker";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { EmptyState, PageHeader, PageSkeleton, RarityBadge } from "@/components/misc";

export const metadata: Metadata = { title: "Gegenstände" };

type Search = { campaign?: string; q?: string; category?: string };

async function Items({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdminPage();
  const [params, campaigns] = await Promise.all([searchParams, adminListCampaigns()]);
  const campaign = pickCampaign(campaigns, params.campaign);
  if (!campaign) {
    return (
      <>
        <PageHeader title="Gegenstände" />
        <EmptyState
          icon={<MapIcon />}
          title="Zuerst eine Kampagne anlegen"
          description="Jede Kampagne hat ihre eigene Gegenstandsbibliothek."
          action={
            <Button asChild>
              <Link href="/admin/campaigns/new">Kampagne anlegen</Link>
            </Button>
          }
        />
      </>
    );
  }
  const query = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const category = (ITEM_CATEGORIES as readonly string[]).includes(params.category ?? "") ? params.category : undefined;
  const [items, usage] = await Promise.all([
    adminListItems(campaign.id, { query, category }),
    adminItemUsageCounts(campaign.id),
  ]);
  const filtered = Boolean(query || category);

  return (
    <>
      <PageHeader
        title="Gegenstände"
        description={`Bibliothek der Kampagne „${campaign.name}“. Ein Gegenstand kann in mehreren Inventarlisten verwendet werden.`}
        actions={
          <Button asChild>
            <Link href={`/admin/items/new?campaign=${campaign.id}`}>
              <Plus aria-hidden /> Neuer Gegenstand
            </Link>
          </Button>
        }
      />
      <CampaignPicker campaigns={campaigns} currentId={campaign.id} basePath="/admin/items" />

      <form method="get" action="/admin/items" role="search" className="mb-5 flex flex-col gap-2 sm:flex-row">
        <input type="hidden" name="campaign" value={campaign.id} />
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input type="search" name="q" defaultValue={query} placeholder="Name oder Beschreibung …" aria-label="Gegenstände suchen" className="pl-9" />
        </div>
        <NativeSelect name="category" defaultValue={category ?? ""} aria-label="Kategorie" className="sm:w-56">
          <option value="">Alle Kategorien</option>
          {ITEM_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {ITEM_CATEGORY_LABELS[c]}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="outline">
          Suchen
        </Button>
        {filtered && (
          <Button asChild variant="ghost">
            <Link href={`/admin/items?campaign=${campaign.id}`}>Zurücksetzen</Link>
          </Button>
        )}
      </form>

      {items.length === 0 ? (
        filtered ? (
          <EmptyState icon={<Search />} title="Nichts gefunden" description="Kein Gegenstand passt zu dieser Suche." />
        ) : (
          <EmptyState
            icon={<Swords />}
            title="Noch keine Gegenstände"
            description="Lege Gegenstände an und füge sie anschließend den Inventarlisten der Händler hinzu."
            action={
              <Button asChild>
                <Link href={`/admin/items/new?campaign=${campaign.id}`}>Gegenstand anlegen</Link>
              </Button>
            }
          />
        )
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface/95">
          <table className="w-full min-w-[40rem] text-left text-[0.95rem]">
            <thead className="border-b border-border text-sm text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Gegenstand</th>
                <th scope="col" className="px-4 py-3 font-semibold">Kategorie</th>
                <th scope="col" className="px-4 py-3 font-semibold">Seltenheit</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Grundpreis</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">In Listen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-surface-2">
                  <th scope="row" className="px-4 py-2.5">
                    <Link href={`/admin/items/${item.id}`} className="flex items-center gap-3 font-semibold hover:text-primary">
                      <img src={itemImage(item.imagePath, item.category)} alt="" className="size-9 shrink-0 rounded-md border border-border" />
                      {item.name}
                    </Link>
                  </th>
                  <td className="px-4 py-2.5">{ITEM_CATEGORY_LABELS[item.category as ItemCategory] ?? "Sonstiges"}</td>
                  <td className="px-4 py-2.5">
                    <RarityBadge rarity={item.rarity} />
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-primary tabular-nums">
                    {formatPrice(item.basePriceCopper, isCurrency(item.displayCurrency) ? item.displayCurrency : "gp")}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{usage.get(item.id) ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function AdminItemsPage({ searchParams }: PageProps<"/admin/items">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Items searchParams={searchParams} />
    </Suspense>
  );
}
