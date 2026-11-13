import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { listAssets } from "@/lib/assets";
import { requireAdminPage } from "@/lib/auth/session";
import { adminGetCampaign } from "@/lib/dal/admin";
import { isUuid } from "@/lib/utils";
import { updateThemeAction } from "@/features/campaigns/actions";
import { ThemeForm } from "@/components/admin/theme-form";
import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumbs, PageHeader, PageSkeleton } from "@/components/misc";

export const metadata: Metadata = { title: "Design" };

async function Theme({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const campaign = await adminGetCampaign(id);
  if (!campaign) notFound();
  return (
    <>
      <PageHeader
        eyebrow={
          <Breadcrumbs
            items={[
              { label: "Kampagnen", href: "/admin/campaigns" },
              { label: campaign.name, href: `/admin/campaigns/${campaign.id}` },
              { label: "Design" },
            ]}
          />
        }
        title="Design & Layout"
        description="Farben, Schrift, Hintergrund und Layout dieser Kampagne. Die Vorschau zeigt Änderungen sofort."
      />
      <Card>
        <CardContent className="pt-5">
          <ThemeForm
            action={updateThemeAction.bind(null, campaign.id)}
            theme={campaign.theme}
            campaignName={campaign.name}
            currentDay={campaign.currentDay}
            backgrounds={listAssets("backgrounds")}
          />
        </CardContent>
      </Card>
    </>
  );
}

export default function ThemePage({ params }: PageProps<"/admin/campaigns/[id]/theme">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Theme params={params} />
    </Suspense>
  );
}
