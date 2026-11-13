import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { requireAdminPage } from "@/lib/auth/session";
import { adminGetCampaign, adminGetItem, adminItemUsage } from "@/lib/dal/admin";
import { isUuid } from "@/lib/utils";
import { deleteItemAction, updateItemAction } from "@/features/items/actions";
import { ActionButton } from "@/components/action-button";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { ItemFields } from "@/components/admin/fields";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs, PageHeader, PageSkeleton } from "@/components/misc";

export const metadata: Metadata = { title: "Gegenstand bearbeiten" };

async function EditItem({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const item = await adminGetItem(id);
  if (!item) notFound();
  const [campaign, usage] = await Promise.all([adminGetCampaign(item.campaignId), adminItemUsage(item.id)]);
  return (
    <>
      <PageHeader
        eyebrow={<Breadcrumbs items={[{ label: "Gegenstände", href: `/admin/items?campaign=${item.campaignId}` }, { label: item.name }]} />}
        title={item.name}
        description={campaign ? `Kampagne: ${campaign.name}` : undefined}
      />
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-5">
            <ActionForm action={updateItemAction.bind(null, item.id)}>
              <ItemFields item={item} />
              <div className="mt-6">
                <SubmitButton>Speichern</SubmitButton>
              </div>
            </ActionForm>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verwendung</CardTitle>
            <CardDescription>Menge und abweichender Preis werden pro Inventarliste beim jeweiligen Händler gepflegt.</CardDescription>
          </CardHeader>
          <CardContent>
            {usage.length === 0 ? (
              <p className="text-muted">Dieser Gegenstand ist in keiner Inventarliste.</p>
            ) : (
              <ul className="list-inside list-disc space-y-1">
                {usage.map((u) => (
                  <li key={u.listId}>
                    <Link href={`/admin/shops/${u.shopId}`} className="font-semibold hover:text-primary hover:underline">
                      {u.shopName}
                    </Link>{" "}
                    <span className="text-muted">– {u.listName}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle>Gegenstand löschen</CardTitle>
            <CardDescription>Entfernt den Gegenstand aus der Bibliothek und aus allen Inventarlisten.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActionButton
              action={deleteItemAction.bind(null, item.id)}
              variant="destructive"
              confirm={{
                title: `„${item.name}“ wirklich löschen?`,
                description:
                  usage.length > 0
                    ? `Der Gegenstand wird auch aus ${usage.length} Inventarliste${usage.length === 1 ? "" : "n"} entfernt.`
                    : "Das kann nicht rückgängig gemacht werden.",
                confirmLabel: "Gegenstand löschen",
              }}
            >
              <Trash2 aria-hidden /> Gegenstand löschen
            </ActionButton>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function EditItemPage({ params }: PageProps<"/admin/items/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EditItem params={params} />
    </Suspense>
  );
}
