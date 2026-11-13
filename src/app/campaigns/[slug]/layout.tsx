import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requirePlayerPage } from "@/lib/auth/session";
import { playerGetCampaign, playerListCampaigns } from "@/lib/dal/player";
import { themeToCssVars } from "@/lib/theme";
import { AutoRefresh } from "@/components/auto-refresh";
import { CampaignSelect } from "@/components/campaign-select";
import { DayBadge, PageSkeleton } from "@/components/misc";
import { NavLink } from "@/components/nav-link";
import { SiteFooter, SiteHeader } from "@/components/site-header";

async function CampaignFrame({ params, children }: { params: Promise<{ slug: string }>; children: React.ReactNode }) {
  await requirePlayerPage();
  const { slug } = await params;
  const [campaign, campaigns] = await Promise.all([playerGetCampaign(slug), playerListCampaigns()]);
  if (!campaign) notFound();
  const base = `/campaigns/${campaign.slug}`;
  const tab =
    "border-b-2 border-transparent px-3 py-2.5 text-[0.95rem] font-semibold text-muted transition-colors hover:text-foreground";
  const tabActive = "border-primary text-primary";

  return (
    // The stored theme is applied as validated CSS variables on this wrapper.
    <div style={themeToCssVars(campaign.theme)} className="theme-scope campaign-backdrop flex min-h-dvh flex-1 flex-col">
      <SiteHeader>
        {/* Desktop: campaign tabs. Mobile: compact switcher. */}
        <nav aria-label="Kampagnen" className="hidden min-w-0 items-center gap-1 overflow-x-auto md:flex">
          {campaigns.map((c) => (
            <NavLink
              key={c.id}
              href={`/campaigns/${c.slug}`}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              activeClassName="bg-primary/15 text-primary"
            >
              {c.name}
            </NavLink>
          ))}
        </nav>
        <div className="md:hidden">
          <CampaignSelect campaigns={campaigns.map((c) => ({ slug: c.slug, name: c.name }))} current={campaign.slug} />
        </div>
      </SiteHeader>

      <div className="game-campaign-bar border-b border-border bg-background/70">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 pt-4">
          <div className="flex min-w-0 items-center gap-4 pb-2">
            <p className="truncate font-display text-xl font-semibold sm:text-2xl">{campaign.name}</p>
            <DayBadge day={campaign.currentDay} />
          </div>
          <nav aria-label="Bereiche der Kampagne" className="game-tabs -mb-px flex gap-1">
            <NavLink href={base} exact className={tab} activeClassName={tabActive}>
              Übersicht
            </NavLink>
            <NavLink href={`${base}/shops`} className={tab} activeClassName={tabActive}>
              Händler
            </NavLink>
            <NavLink href={`${base}/tools`} className={tab} activeClassName={tabActive}>
              Werkzeuge
            </NavLink>
          </nav>
        </div>
      </div>

      <main id="inhalt" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
      <SiteFooter />
      <AutoRefresh intervalSeconds={45} />
    </div>
  );
}

export default function CampaignLayout({ children, params }: LayoutProps<"/campaigns/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CampaignFrame params={params}>{children}</CampaignFrame>
    </Suspense>
  );
}
