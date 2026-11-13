import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/session";
import { adminGetCampaign } from "@/lib/dal/admin";
import { isUuid } from "@/lib/utils";
import { createShopAction } from "@/features/shops/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { ShopFields } from "@/components/admin/fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumbs, PageHeader, PageSkeleton } from "@/components/misc";

export const metadata: Metadata = { title: "Neuer Händler" };

async function NewShop({ searchParams }: { searchParams: Promise<{ campaign?: string }> }) {
  await requireAdminPage();
  const { campaign: campaignId } = await searchParams;
  if (!isUuid(campaignId)) notFound();
  const campaign = await adminGetCampaign(campaignId);
  if (!campaign) notFound();
  return (
    <>
      <PageHeader
        eyebrow={<Breadcrumbs items={[{ label: "Händler", href: `/admin/shops?campaign=${campaign.id}` }, { label: "Neu" }]} />}
        title="Neuer Händler"
        description={`Kampagne: ${campaign.name}. Inventarlisten werden nach dem Anlegen hinzugefügt.`}
      />
      <Card>
        <CardContent className="pt-5">
          <ActionForm action={createShopAction.bind(null, campaign.id)}>
            <ShopFields currentDay={campaign.currentDay} />
            <div className="mt-6 flex flex-wrap gap-2">
              <SubmitButton pendingLabel="Wird angelegt …">Händler anlegen</SubmitButton>
              <Button asChild variant="ghost">
                <Link href={`/admin/shops?campaign=${campaign.id}`}>Abbrechen</Link>
              </Button>
            </div>
          </ActionForm>
        </CardContent>
      </Card>
    </>
  );
}

export default function NewShopPage({ searchParams }: PageProps<"/admin/shops/new">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewShop searchParams={searchParams} />
    </Suspense>
  );
}
