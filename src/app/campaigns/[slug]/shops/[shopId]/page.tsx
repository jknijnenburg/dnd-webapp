/* eslint-disable @next/next/no-img-element -- local static SVG placeholders */
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CalendarClock, PackageOpen, UserRound } from "lucide-react";
import { shopImage } from "@/lib/assets";
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

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted">
        <Breadcrumbs items={[{ label: "Händler", href: `/campaigns/${campaign.slug}/shops` }, { label: shop.name }]} />
      </div>

      <section className="flex flex-col gap-5 rounded-lg border border-border bg-surface/95 p-5 sm:flex-row sm:items-start">
        <img src={shopImage(shop.imagePath)} alt="" className="h-32 w-full shrink-0 rounded-md border border-border object-cover sm:size-32" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold sm:text-3xl">{shop.name}</h1>
            {shop.category && <Badge variant="muted">{shop.category}</Badge>}
          </div>
          {shop.merchantName && (
            <p className="mt-1 flex items-center gap-1.5 text-muted">
              <UserRound className="size-4" aria-hidden /> {shop.merchantName}
            </p>
          )}
          {shop.description && <p className="prose-plain mt-3 max-w-3xl">{shop.description}</p>}
          <p className="mt-4 inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
            <CalendarClock className="size-4" aria-hidden />
            {refreshLabel(shop.nextRefreshDay, campaign.currentDay)}
          </p>
        </div>
      </section>

      <section aria-labelledby="stock-heading">
        <h2 id="stock-heading" className="mb-4 text-xl font-semibold">
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
