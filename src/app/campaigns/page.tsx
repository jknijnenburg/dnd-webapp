/* eslint-disable @next/next/no-img-element -- local static SVG placeholders */
import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Map as MapIcon } from "lucide-react";
import { coverImage } from "@/lib/assets";
import { requirePlayerPage } from "@/lib/auth/session";
import { playerListCampaigns } from "@/lib/dal/player";
import { themeToCssVars } from "@/lib/theme";
import { AutoRefresh } from "@/components/auto-refresh";
import { Button } from "@/components/ui/button";
import { DayBadge, EmptyState, PageHeader, PageSkeleton } from "@/components/misc";
import { SiteFooter, SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Kampagnen" };

async function CampaignOverview() {
  const session = await requirePlayerPage();
  const campaigns = await playerListCampaigns();
  return (
    <>
      <SiteHeader />
      <main id="inhalt" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <PageHeader title="Kampagnen" description="Wähle eine Kampagne, um ihre Händler und Waren zu sehen." />
        {campaigns.length === 0 ? (
          <EmptyState
            icon={<MapIcon />}
            title="Noch keine Kampagnen"
            description="Sobald die Spielleitung eine Kampagne anlegt, erscheint sie hier."
            action={
              session.role === "admin" ? (
                <Button asChild>
                  <Link href="/admin/campaigns/new">Erste Kampagne anlegen</Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign) => (
              <li key={campaign.id}>
                {/* Each card previews its own campaign theme. */}
                <Link
                  href={`/campaigns/${campaign.slug}`}
                  style={themeToCssVars(campaign.theme)}
                  className="theme-scope group flex h-full flex-col overflow-hidden rounded-lg border border-border transition-colors hover:border-primary"
                >
                  <img src={coverImage(campaign.coverImagePath)} alt="" className="h-36 w-full border-b border-border object-cover" />
                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-xl font-semibold group-hover:text-primary">{campaign.name}</h2>
                      <DayBadge day={campaign.currentDay} className="shrink-0" />
                    </div>
                    {campaign.description && <p className="line-clamp-3 text-muted">{campaign.description}</p>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
      <AutoRefresh intervalSeconds={60} />
    </>
  );
}

export default function CampaignsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CampaignOverview />
    </Suspense>
  );
}
