import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, Download, Eye, Palette, Store, Swords, Trash2 } from "lucide-react";
import { requireAdminPage } from "@/lib/auth/session";
import { adminGetCampaign } from "@/lib/dal/admin";
import { isUuid } from "@/lib/utils";
import { deleteCampaignAction, updateCampaignAction } from "@/features/campaigns/actions";
import { ActionButton } from "@/components/action-button";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { CampaignFields } from "@/components/admin/fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs, DayBadge, PageHeader, PageSkeleton } from "@/components/misc";

export const metadata: Metadata = { title: "Kampagne bearbeiten" };

async function EditCampaign({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const campaign = await adminGetCampaign(id);
  if (!campaign) notFound();
  return (
    <>
      <PageHeader
        eyebrow={<Breadcrumbs items={[{ label: "Kampagnen", href: "/admin/campaigns" }, { label: campaign.name }]} />}
        title={campaign.name}
        actions={<DayBadge day={campaign.currentDay} />}
      />
      <div className="mb-6 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/campaigns/${campaign.id}/time`}>
            <CalendarClock aria-hidden /> Spielzeit
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/campaigns/${campaign.id}/theme`}>
            <Palette aria-hidden /> Design
          </Link>
        </Button>
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
        <Button asChild variant="ghost" size="sm">
          <Link href={`/campaigns/${campaign.slug}`}>
            <Eye aria-hidden /> Spieleransicht
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Stammdaten</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={updateCampaignAction.bind(null, campaign.id)}>
              <CampaignFields campaign={campaign} />
              <div className="mt-6">
                <SubmitButton>Speichern</SubmitButton>
              </div>
            </ActionForm>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Datensicherung</CardTitle>
            <CardDescription>Lädt alle Daten dieser Kampagne (Design, Händler, Listen, Gegenstände) als JSON-Datei herunter.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <a href={`/api/admin/campaigns/${campaign.id}/export`} download>
                <Download aria-hidden /> JSON-Export herunterladen
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle>Kampagne löschen</CardTitle>
            <CardDescription>
              Löscht die Kampagne mit allen Händlern, Inventarlisten, Gegenständen und dem Protokoll. Das kann nicht rückgängig gemacht werden.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActionButton
              action={deleteCampaignAction.bind(null, campaign.id)}
              variant="destructive"
              confirm={{
                title: `„${campaign.name}“ wirklich löschen?`,
                description: "Alle Händler, Inventarlisten und Gegenstände dieser Kampagne werden unwiderruflich gelöscht.",
                confirmLabel: "Endgültig löschen",
              }}
            >
              <Trash2 aria-hidden /> Kampagne löschen
            </ActionButton>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function EditCampaignPage({ params }: PageProps<"/admin/campaigns/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EditCampaign params={params} />
    </Suspense>
  );
}
