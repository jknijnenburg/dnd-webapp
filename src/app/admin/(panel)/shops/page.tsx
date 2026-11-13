import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { EyeOff, Map as MapIcon, Plus, Store } from "lucide-react";
import { requireAdminPage } from "@/lib/auth/session";
import { adminListCampaigns, adminListCounts, adminListShops } from "@/lib/dal/admin";
import { CampaignPicker, pickCampaign } from "@/components/admin/campaign-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, PageSkeleton } from "@/components/misc";

export const metadata: Metadata = { title: "Händler" };

async function Shops({ searchParams }: { searchParams: Promise<{ campaign?: string }> }) {
  await requireAdminPage();
  const [{ campaign: requested }, campaigns] = await Promise.all([searchParams, adminListCampaigns()]);
  const campaign = pickCampaign(campaigns, requested);
  if (!campaign) {
    return (
      <>
        <PageHeader title="Händler" />
        <EmptyState
          icon={<MapIcon />}
          title="Zuerst eine Kampagne anlegen"
          description="Händler gehören immer zu einer Kampagne."
          action={
            <Button asChild>
              <Link href="/admin/campaigns/new">Kampagne anlegen</Link>
            </Button>
          }
        />
      </>
    );
  }
  const [shops, listCounts] = await Promise.all([adminListShops(campaign.id), adminListCounts(campaign.id)]);
  return (
    <>
      <PageHeader
        title="Händler"
        description={`Händler der Kampagne „${campaign.name}“ (heute Tag ${campaign.currentDay}).`}
        actions={
          <Button asChild>
            <Link href={`/admin/shops/new?campaign=${campaign.id}`}>
              <Plus aria-hidden /> Neuer Händler
            </Link>
          </Button>
        }
      />
      <CampaignPicker campaigns={campaigns} currentId={campaign.id} basePath="/admin/shops" />
      {shops.length === 0 ? (
        <EmptyState
          icon={<Store />}
          title="Noch keine Händler"
          description="Lege den ersten Händler dieser Kampagne an und gib ihm mehrere Inventarlisten."
          action={
            <Button asChild>
              <Link href={`/admin/shops/new?campaign=${campaign.id}`}>Händler anlegen</Link>
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface/95">
          <table className="w-full min-w-[40rem] text-left text-[0.95rem]">
            <thead className="border-b border-border text-sm text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Händler</th>
                <th scope="col" className="px-4 py-3 font-semibold">Intervall</th>
                <th scope="col" className="px-4 py-3 font-semibold">Nächster Wechsel</th>
                <th scope="col" className="px-4 py-3 font-semibold">Listen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shops.map((shop) => (
                <tr key={shop.id} className="hover:bg-surface-2">
                  <th scope="row" className="px-4 py-3">
                    <Link href={`/admin/shops/${shop.id}`} className="font-semibold hover:text-primary hover:underline">
                      {shop.name}
                    </Link>
                    {!shop.isVisible && (
                      <Badge variant="muted" className="ml-2">
                        <EyeOff aria-hidden /> versteckt
                      </Badge>
                    )}
                    {shop.merchantName && <span className="block text-sm font-normal text-muted">{shop.merchantName}</span>}
                  </th>
                  <td className="px-4 py-3 tabular-nums">alle {shop.refreshIntervalDays} Tage</td>
                  <td className="px-4 py-3 font-semibold text-primary tabular-nums">Tag {shop.nextRefreshDay}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {listCounts.get(shop.id) ?? 0}
                    {(listCounts.get(shop.id) ?? 0) === 0 && <span className="ml-2 text-sm text-muted">(leeres Sortiment)</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function AdminShopsPage({ searchParams }: PageProps<"/admin/shops">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Shops searchParams={searchParams} />
    </Suspense>
  );
}
