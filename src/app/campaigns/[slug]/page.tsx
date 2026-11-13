/* eslint-disable @next/next/no-img-element -- local static SVG placeholders */
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarClock, Store, Wrench } from "lucide-react";
import { coverImage } from "@/lib/assets";
import { requirePlayerPage } from "@/lib/auth/session";
import { playerGetCampaign, playerListShops } from "@/lib/dal/player";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/misc";

async function Dashboard({ params }: { params: Promise<{ slug: string }> }) {
  await requirePlayerPage();
  const { slug } = await params;
  const campaign = await playerGetCampaign(slug);
  if (!campaign) notFound();
  const shops = await playerListShops(campaign.id);
  const upcoming = [...shops].sort((a, b) => a.nextRefreshDay - b.nextRefreshDay).slice(0, 5);
  const base = `/campaigns/${campaign.slug}`;

  return (
    <div className="space-y-8">
      <section className="fantasy-panel campaign-hero overflow-hidden rounded-lg border border-border bg-surface/95">
        <img src={coverImage(campaign.coverImagePath)} alt="" className="h-40 w-full border-b border-border object-cover sm:h-56" />
        <div className="p-6">
          <h1 className="text-3xl font-semibold sm:text-4xl">{campaign.name}</h1>
          <p className="mt-2 font-display text-primary">
            Heute ist Tag <span className="text-xl font-bold tabular-nums">{campaign.currentDay}</span> der Kampagne
          </p>
          {campaign.description && <p className="prose-plain mt-4 max-w-3xl text-muted">{campaign.description}</p>}
        </div>
      </section>

      <section aria-labelledby="module-heading">
        <h2 id="module-heading" className="mb-4 text-xl font-semibold">
          Bereiche
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href={`${base}/shops`} className="group">
            <Card className="h-full transition-colors group-hover:border-primary/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 group-hover:text-primary">
                  <Store className="size-5 text-primary" aria-hidden /> Händler
                </CardTitle>
                <CardDescription>
                  {shops.length === 0
                    ? "Noch keine Händler in dieser Kampagne."
                    : `${shops.length} Händler mit wechselndem Sortiment.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-1 text-sm font-semibold text-primary">
                Zu den Händlern <ArrowRight className="size-4" aria-hidden />
              </CardContent>
            </Card>
          </Link>
          <Link href={`${base}/tools`} className="group">
            <Card className="h-full transition-colors group-hover:border-primary/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 group-hover:text-primary">
                  <Wrench className="size-5 text-primary" aria-hidden /> Werkzeuge
                </CardTitle>
                <CardDescription>Platz für künftige Hilfsmittel dieser Kampagne.</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-1 text-sm font-semibold text-primary">
                Ansehen <ArrowRight className="size-4" aria-hidden />
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>

      {upcoming.length > 0 && (
        <section aria-labelledby="refresh-heading">
          <h2 id="refresh-heading" className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <CalendarClock className="size-5 text-primary" aria-hidden /> Nächste Sortimentswechsel
          </h2>
          <ul className="fantasy-panel divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface/95">
            {upcoming.map((shop) => {
              const days = shop.nextRefreshDay - campaign.currentDay;
              return (
                <li key={shop.id}>
                  <Link href={`${base}/shops/${shop.id}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-surface-2">
                    <span className="font-semibold">{shop.name}</span>
                    <span className="text-right text-sm text-muted">
                      Tag <span className="font-semibold text-primary tabular-nums">{shop.nextRefreshDay}</span>
                      {days > 0 && ` · in ${days} ${days === 1 ? "Tag" : "Tagen"}`}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function CampaignPage({ params }: PageProps<"/campaigns/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Dashboard params={params} />
    </Suspense>
  );
}
