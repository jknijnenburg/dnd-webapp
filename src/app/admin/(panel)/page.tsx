import { Suspense } from "react";
import Link from "next/link";
import { CalendarPlus, Map as MapIcon, Palette, Plus, Store, Swords } from "lucide-react";
import { requireAdminPage } from "@/lib/auth/session";
import { adminCampaignStats, adminListCampaigns } from "@/lib/dal/admin";
import { advanceDayAction } from "@/features/campaigns/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DayBadge, EmptyState, PageHeader, PageSkeleton } from "@/components/misc";

async function Dashboard() {
  await requireAdminPage();
  const [campaigns, stats] = await Promise.all([adminListCampaigns(), adminCampaignStats()]);
  return (
    <>
      <PageHeader
        title="Übersicht"
        description="Kampagnen, Spieltage und Schnellaktionen."
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
          description="Lege die erste Kampagne an, um Händler und Gegenstände zu verwalten."
          action={
            <Button asChild>
              <Link href="/admin/campaigns/new">Kampagne anlegen</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-5 md:grid-cols-2">
          {campaigns.map((campaign) => {
            const s = stats.get(campaign.id);
            return (
              <li key={campaign.id}>
                <Card className="h-full">
                  <CardHeader className="flex-row items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-xl">
                        <Link href={`/admin/campaigns/${campaign.id}`} className="hover:text-primary">
                          {campaign.name}
                        </Link>
                      </CardTitle>
                      <p className="mt-1 text-sm text-muted">
                        {s?.shopCount ?? 0} Händler · {s?.itemCount ?? 0} Gegenstände
                      </p>
                    </div>
                    <DayBadge day={campaign.currentDay} className="shrink-0" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ActionForm action={advanceDayAction.bind(null, campaign.id)} className="rounded-md border border-border bg-background/40 p-3">
                      {/* The day the admin sees – a stale or repeated submit is rejected server-side. */}
                      <input type="hidden" name="expectedCurrentDay" value={campaign.currentDay} />
                      <p className="mb-2 text-sm font-semibold">Spieltage voranschreiten</p>
                      <div className="flex flex-wrap gap-2">
                        {[1, 3, 7].map((days) => (
                          <SubmitButton key={days} name="days" value={days} variant="outline" size="sm" pendingLabel={`+${days} …`}>
                            <CalendarPlus aria-hidden /> +{days} {days === 1 ? "Tag" : "Tage"}
                          </SubmitButton>
                        ))}
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/admin/campaigns/${campaign.id}/time`}>Vorschau & mehr</Link>
                        </Button>
                      </div>
                    </ActionForm>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/shops?campaign=${campaign.id}`}>
                          <Store aria-hidden /> Händler
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/items?campaign=${campaign.id}`}>
                          <Swords aria-hidden /> Gegenstände
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/campaigns/${campaign.id}/theme`}>
                          <Palette aria-hidden /> Design
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}
