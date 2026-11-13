import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { CalendarClock, Map as MapIcon, Palette, Pencil, Plus } from "lucide-react";
import { requireAdminPage } from "@/lib/auth/session";
import { adminCampaignStats, adminListCampaigns } from "@/lib/dal/admin";
import { Button } from "@/components/ui/button";
import { DayBadge, EmptyState, PageHeader, PageSkeleton } from "@/components/misc";

export const metadata: Metadata = { title: "Kampagnen" };

async function Campaigns() {
  await requireAdminPage();
  const [campaigns, stats] = await Promise.all([adminListCampaigns(), adminCampaignStats()]);
  return (
    <>
      <PageHeader
        title="Kampagnen"
        description="Kampagnen anlegen, bearbeiten und löschen."
        actions={
          <Button asChild>
            <Link href="/admin/campaigns/new">
              <Plus aria-hidden /> Neue Kampagne
            </Link>
          </Button>
        }
      />
      {campaigns.length === 0 ? (
        <EmptyState
          icon={<MapIcon />}
          title="Noch keine Kampagnen"
          description="Mit einer Kampagne beginnt alles: Sie hat einen eigenen Tageszähler, ein eigenes Design und eigene Händler."
          action={
            <Button asChild>
              <Link href="/admin/campaigns/new">Kampagne anlegen</Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface/95">
          {campaigns.map((campaign) => {
            const s = stats.get(campaign.id);
            return (
              <li key={campaign.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/campaigns/${campaign.id}`} className="font-display text-lg font-semibold hover:text-primary">
                    {campaign.name}
                  </Link>
                  <p className="text-sm text-muted">
                    /campaigns/{campaign.slug} · {s?.shopCount ?? 0} Händler · {s?.itemCount ?? 0} Gegenstände
                  </p>
                </div>
                <DayBadge day={campaign.currentDay} />
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/campaigns/${campaign.id}`}>
                      <Pencil aria-hidden /> Bearbeiten
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/campaigns/${campaign.id}/theme`}>
                      <Palette aria-hidden /> Design
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/campaigns/${campaign.id}/time`}>
                      <CalendarClock aria-hidden /> Spielzeit
                    </Link>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export default function AdminCampaignsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Campaigns />
    </Suspense>
  );
}
