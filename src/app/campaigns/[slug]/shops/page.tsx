import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Store } from "lucide-react";
import { requirePlayerPage } from "@/lib/auth/session";
import { playerGetCampaign, playerListShops } from "@/lib/dal/player";
import { normalizeLayoutPreset } from "@/lib/theme";
import { EmptyState, PageSkeleton } from "@/components/misc";
import { GameScene } from "@/components/game-scene";
import { ShopBrowser } from "@/components/shop-browser";

async function Shops({ params }: { params: Promise<{ slug: string }> }) {
  await requirePlayerPage();
  const { slug } = await params;
  const campaign = await playerGetCampaign(slug);
  if (!campaign) notFound();
  const shops = await playerListShops(campaign.id);
  return (
    <>
      <GameScene
        title="Der Marktplatz"
        eyebrow={`${campaign.name} · Tag ${campaign.currentDay}`}
        description="Seltene Schätze. Seltsame Händler. Und vielleicht genau das, was deinem nächsten Abenteuer noch fehlt."
      >
        <span className="game-scene-note">{shops.length} Händler in dieser Kampagne</span>
      </GameScene>
      {shops.length === 0 ? (
        <EmptyState icon={<Store />} title="Noch keine Händler" description="In dieser Kampagne hat noch kein Händler geöffnet." />
      ) : (
        <ShopBrowser
          slug={campaign.slug}
          currentDay={campaign.currentDay}
          layout={normalizeLayoutPreset(campaign.theme.layoutPreset)}
          // Only the fields the list needs are sent to the browser.
          shops={shops.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            merchantName: s.merchantName,
            category: s.category,
            imagePath: s.imagePath,
            nextRefreshDay: s.nextRefreshDay,
          }))}
        />
      )}
    </>
  );
}

export default function ShopsPage({ params }: PageProps<"/campaigns/[slug]/shops">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Shops params={params} />
    </Suspense>
  );
}
