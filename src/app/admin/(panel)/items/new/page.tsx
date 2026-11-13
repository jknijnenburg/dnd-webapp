import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/session";
import { adminGetCampaign } from "@/lib/dal/admin";
import { isUuid } from "@/lib/utils";
import { createItemAction } from "@/features/items/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { ItemFields } from "@/components/admin/fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumbs, PageHeader, PageSkeleton } from "@/components/misc";

export const metadata: Metadata = { title: "Neuer Gegenstand" };

async function NewItem({ searchParams }: { searchParams: Promise<{ campaign?: string }> }) {
  await requireAdminPage();
  const { campaign: campaignId } = await searchParams;
  if (!isUuid(campaignId)) notFound();
  const campaign = await adminGetCampaign(campaignId);
  if (!campaign) notFound();
  return (
    <>
      <PageHeader
        eyebrow={<Breadcrumbs items={[{ label: "Gegenstände", href: `/admin/items?campaign=${campaign.id}` }, { label: "Neu" }]} />}
        title="Neuer Gegenstand"
        description={`Kampagne: ${campaign.name}`}
      />
      <Card>
        <CardContent className="pt-5">
          <ActionForm action={createItemAction.bind(null, campaign.id)}>
            <ItemFields />
            <div className="mt-6 flex flex-wrap gap-2">
              <SubmitButton pendingLabel="Wird angelegt …">Gegenstand anlegen</SubmitButton>
              <Button asChild variant="ghost">
                <Link href={`/admin/items?campaign=${campaign.id}`}>Abbrechen</Link>
              </Button>
            </div>
          </ActionForm>
        </CardContent>
      </Card>
    </>
  );
}

export default function NewItemPage({ searchParams }: PageProps<"/admin/items/new">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewItem searchParams={searchParams} />
    </Suspense>
  );
}
