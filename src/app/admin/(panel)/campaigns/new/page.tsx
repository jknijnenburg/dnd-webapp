import type { Metadata } from "next";
import Link from "next/link";
import { createCampaignAction } from "@/features/campaigns/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { CampaignFields } from "@/components/admin/fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumbs, PageHeader } from "@/components/misc";

export const metadata: Metadata = { title: "Neue Kampagne" };

// No data is read here; the action itself re-checks the admin session.
export default function NewCampaignPage() {
  return (
    <>
      <PageHeader
        eyebrow={<Breadcrumbs items={[{ label: "Kampagnen", href: "/admin/campaigns" }, { label: "Neu" }]} />}
        title="Neue Kampagne"
        description="Das Design kann nach dem Anlegen angepasst werden."
      />
      <Card>
        <CardContent className="pt-5">
          <ActionForm action={createCampaignAction}>
            <CampaignFields withStartDay />
            <div className="mt-6 flex flex-wrap gap-2">
              <SubmitButton pendingLabel="Wird angelegt …">Kampagne anlegen</SubmitButton>
              <Button asChild variant="ghost">
                <Link href="/admin/campaigns">Abbrechen</Link>
              </Button>
            </div>
          </ActionForm>
        </CardContent>
      </Card>
    </>
  );
}
