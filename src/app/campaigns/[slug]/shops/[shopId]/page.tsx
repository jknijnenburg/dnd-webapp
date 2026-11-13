/* eslint-disable @next/next/no-img-element -- local static SVG placeholders */
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CalendarClock, PackageOpen, UserRound } from "lucide-react";
import { ShopArtwork } from "@/components/shop-artwork";
import { requirePlayerPage } from "@/lib/auth/session";
import { playerGetCampaign, playerGetShop } from "@/lib/dal/player";
import { refreshLabel } from "@/lib/format";
import { normalizeLayoutPreset } from "@/lib/theme";
import { isUuid } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ItemBrowser } from "@/components/item-browser";
import { Breadcrumbs, EmptyState, PageSkeleton } from "@/components/misc";

async function ShopDetail({ params }: { params: Promise<{ slug: string; shopId: string }> }) {
  await requirePlayerPage();
  const { slug, shopId } = await params;
  if (!isUuid(shopId)) notFound();
  const campaign = await playerGetCampaign(slug);
  if (!campaign) notFound();
  const view = await playerGetShop(campaign.id, shopId);
  if (!view) notFound();
  const { shop, entries } = view;
  const alchemist = /alchem|potion|trank/i.test(`${shop.category ?? ""} ${shop.imagePath ?? ""}`);

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted">
        <Breadcrumbs items={[{ label: "Händler", href: `/campaigns/${campaign.slug}/shops` }, { label: shop.name }]} />
      </div>

      <section className={`merchant-encounter ${alchemist ? "merchant-encounter-character" : ""}`}>
        <div className="merchant-encounter-setting" aria-hidden>
          <ShopArtwork imagePath={shop.imagePath} category={shop.category} />
        </div>
        <div className="merchant-encounter-copy">
          <p className="merchant-encounter-eyebrow">Handel &amp; Kostbarkeiten</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold sm:text-4xl">{shop.name}</h1>
            {shop.category && <Badge variant="muted">{shop.category}</Badge>}
          </div>
          {shop.merchantName && (
            <p className="merchant-encounter-name">
              <UserRound className="size-4" aria-hidden /> {shop.merchantName}
            </p>
          )}
          {shop.description && <p className="prose-plain mt-3">{shop.description}</p>}
          <p className="merchant-refresh">
            <CalendarClock className="size-4" aria-hidden />
            {refreshLabel(shop.nextRefreshDay, campaign.currentDay)}
          </p>
        </div>
        {alchemist && <img className="merchant-encounter-portrait" src="/images/game/merchant-alchemist.webp" alt="" aria-hidden />}
        <span className="merchant-encounter-flourish" aria-hidden>✧</span>
      </section>

      <section aria-labelledby="stock-heading">
        <h2 id="stock-heading" className="fantasy-section-title mb-4 text-xl font-semibold">
          Aktuelles Sortiment
        </h2>
        {entries.length === 0 ? (
          <EmptyState
            icon={<PackageOpen />}
            title="Die Regale sind leer"
            description="Dieser Händler hat im Moment nichts anzubieten. Schau nach dem nächsten Sortimentswechsel wieder vorbei."
          />
        ) : (
          <ItemBrowser
            layout={normalizeLayoutPreset(campaign.theme.layoutPreset)}
            entries={entries.map((e) => ({
              entryId: e.entryId,
              name: e.name,
              description: e.description,
              category: e.category,
              rarity: e.rarity,
              imagePath: e.imagePath,
              properties: e.properties,
              quantity: e.quantity,
              priceCopper: e.priceCopper,
              displayCurrency: e.displayCurrency,
            }))}
          />
        )}
      </section>
    </div>
  );
}

export default function ShopPage({ params }: PageProps<"/campaigns/[slug]/shops/[shopId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ShopDetail params={params} />
    </Suspense>
  );
}
