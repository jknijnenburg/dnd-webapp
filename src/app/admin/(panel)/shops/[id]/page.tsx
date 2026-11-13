/* eslint-disable @next/next/no-img-element -- local static SVG placeholders */
import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowUp, Check, Eye, ListPlus, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { itemImage } from "@/lib/assets";
import { requireAdminPage } from "@/lib/auth/session";
import { adminGetShop, adminListItems } from "@/lib/dal/admin";
import { ITEM_CATEGORY_LABELS, type ItemCategory } from "@/lib/constants";
import { CURRENCIES, CURRENCY_LABELS, copperToAmountString, formatPrice, isCurrency } from "@/lib/money";
import { cn, isUuid } from "@/lib/utils";
import {
  addListItemAction,
  createListAction,
  deleteListAction,
  deleteShopAction,
  moveListAction,
  moveListItemAction,
  removeListItemAction,
  renameListAction,
  rotateShopAction,
  setActiveListAction,
  updateListItemAction,
  updateShopAction,
} from "@/features/shops/actions";
import { ActionButton } from "@/components/action-button";
import { ActionForm, Field, SubmitButton } from "@/components/action-form";
import { ShopFields } from "@/components/admin/fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, NativeSelect } from "@/components/ui/input";
import { Breadcrumbs, DayBadge, EmptyState, PageHeader, PageSkeleton, RarityBadge } from "@/components/misc";

export const metadata: Metadata = { title: "Händler bearbeiten" };

function CurrencySelect({ name, defaultValue, label }: { name: string; defaultValue: string; label: string }) {
  return (
    <NativeSelect name={name} aria-label={label} defaultValue={defaultValue} className="w-20 px-2">
      {CURRENCIES.map((c) => (
        <option key={c} value={c}>
          {CURRENCY_LABELS[c]}
        </option>
      ))}
    </NativeSelect>
  );
}

async function EditShop({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const view = await adminGetShop(id);
  if (!view) notFound();
  const { shop, campaign, lists } = view;
  const library = await adminListItems(campaign.id);
  const activeIndex = lists.findIndex((l) => l.id === shop.activeInventoryListId);
  const nextList = lists.length > 1 ? lists[(Math.max(activeIndex, 0) + 1) % lists.length] : null;

  return (
    <>
      <PageHeader
        eyebrow={<Breadcrumbs items={[{ label: "Händler", href: `/admin/shops?campaign=${campaign.id}` }, { label: shop.name }]} />}
        title={shop.name}
        description={`Kampagne: ${campaign.name}`}
        actions={
          <>
            <DayBadge day={campaign.currentDay} />
            {shop.isVisible && (
              <Button asChild variant="ghost" size="sm">
                <Link href={`/campaigns/${campaign.slug}/shops/${shop.id}`}>
                  <Eye aria-hidden /> Spieleransicht
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Sortimentswechsel</CardTitle>
            <CardDescription>
              Planmäßig alle {shop.refreshIntervalDays} Spieltage · nächster Wechsel an{" "}
              <span className="font-semibold text-primary">Tag {shop.nextRefreshDay}</span>
              {shop.nextRefreshDay > campaign.currentDay && ` (in ${shop.nextRefreshDay - campaign.currentDay} Tagen)`}.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <ActionButton
              action={rotateShopAction.bind(null, shop.id, shop.activeInventoryListId)}
              variant="secondary"
              disabled={lists.length === 0}
              className="shrink-0"
            >
              <RefreshCw aria-hidden /> Jetzt zur nächsten Liste wechseln
            </ActionButton>
            <p className="text-sm text-muted">
              {lists.length === 0
                ? "Dieser Händler hat noch keine Inventarlisten – sein Sortiment ist leer."
                : nextList
                  ? `Wechselt sofort genau eine Liste weiter (zu „${nextList.name}“). `
                  : "Es gibt nur eine Liste; sie bleibt sichtbar. "}
              {lists.length > 0 && (
                <>
                  Der geplante Wechsel an Tag {shop.nextRefreshDay} wird dadurch <strong>nicht</strong> verschoben oder zurückgesetzt.
                </>
              )}
            </p>
          </CardContent>
        </Card>

        <section aria-labelledby="lists-heading" className="space-y-4">
          <div>
            <h2 id="lists-heading" className="text-xl font-semibold">
              Inventarlisten
            </h2>
            <p className="text-sm text-muted">
              Die Listen wechseln in dieser Reihenfolge (1 → 2 → … → 1). Spieler sehen nur die aktive Liste; hier siehst du alle.
            </p>
          </div>

          {lists.length === 0 && (
            <EmptyState
              icon={<ListPlus />}
              title="Noch keine Inventarlisten"
              description="Lege unten die erste Liste an. Sie wird automatisch zur aktiven Liste."
            />
          )}

          {lists.map((list, index) => {
            const isActive = list.id === shop.activeInventoryListId;
            const available = library.filter((item) => !list.entries.some((e) => e.itemId === item.id));
            return (
              <Card key={list.id} className={cn(isActive && "border-primary/70")}>
                <CardHeader className="gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-full border border-border-strong font-display text-sm font-bold tabular-nums">
                      {index + 1}
                    </span>
                    <CardTitle className="mr-auto">{list.name}</CardTitle>
                    {isActive ? (
                      <Badge variant="primary">
                        <Check aria-hidden /> Aktiv – für Spieler sichtbar
                      </Badge>
                    ) : (
                      <ActionButton action={setActiveListAction.bind(null, list.id)} variant="outline" size="sm">
                        Als aktiv setzen
                      </ActionButton>
                    )}
                    <ActionButton
                      action={moveListAction.bind(null, list.id, "up")}
                      variant="ghost"
                      size="icon"
                      disabled={index === 0}
                      aria-label={`Liste „${list.name}“ nach oben`}
                    >
                      <ArrowUp aria-hidden />
                    </ActionButton>
                    <ActionButton
                      action={moveListAction.bind(null, list.id, "down")}
                      variant="ghost"
                      size="icon"
                      disabled={index === lists.length - 1}
                      aria-label={`Liste „${list.name}“ nach unten`}
                    >
                      <ArrowDown aria-hidden />
                    </ActionButton>
                    <ActionButton
                      action={deleteListAction.bind(null, list.id)}
                      variant="destructive"
                      size="icon"
                      aria-label={`Liste „${list.name}“ löschen`}
                      confirm={{
                        title: `Liste „${list.name}“ löschen?`,
                        description: isActive
                          ? "Diese Liste ist gerade aktiv. Nach dem Löschen wird die nächste Liste aktiv. Die Gegenstände selbst bleiben in der Bibliothek."
                          : "Die Liste wird entfernt. Die Gegenstände selbst bleiben in der Bibliothek.",
                        confirmLabel: "Liste löschen",
                      }}
                    >
                      <Trash2 aria-hidden />
                    </ActionButton>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {list.entries.length === 0 ? (
                    <p className="rounded-md border border-dashed border-border px-4 py-5 text-center text-sm text-muted">
                      Diese Liste ist leer. Füge unten Gegenstände hinzu.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border rounded-md border border-border">
                      {list.entries.map((entry, entryIndex) => {
                        const currency = isCurrency(entry.displayCurrency) ? entry.displayCurrency : "gp";
                        return (
                          <li key={entry.entryId} className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <img src={itemImage(entry.imagePath, entry.category)} alt="" className="size-10 shrink-0 rounded-md border border-border" />
                              <div className="min-w-0">
                                <Link href={`/admin/items/${entry.itemId}`} className="font-semibold hover:text-primary hover:underline">
                                  {entry.name}
                                </Link>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                                  <span>{ITEM_CATEGORY_LABELS[entry.category as ItemCategory] ?? "Sonstiges"}</span>
                                  <RarityBadge rarity={entry.rarity} />
                                  <span>Grundpreis {formatPrice(entry.basePriceCopper, currency)}</span>
                                </div>
                              </div>
                            </div>
                            <ActionForm
                              action={updateListItemAction.bind(null, entry.entryId)}
                              inlineMessage={false}
                              className="flex flex-wrap items-end gap-2"
                            >
                              <Field name="quantity" htmlFor={`qty-${entry.entryId}`} label="Menge" className="w-20">
                                <Input
                                  id={`qty-${entry.entryId}`}
                                  name="quantity"
                                  type="number"
                                  inputMode="numeric"
                                  min={0}
                                  step={1}
                                  defaultValue={entry.quantity}
                                  required
                                />
                              </Field>
                              <Field name="priceOverrideAmount" htmlFor={`price-${entry.entryId}`} label="Listenpreis" className="w-44">
                                <div className="flex gap-1">
                                  <Input
                                    id={`price-${entry.entryId}`}
                                    name="priceOverrideAmount"
                                    inputMode="decimal"
                                    placeholder="Grundpreis"
                                    defaultValue={entry.priceOverrideCopper === null ? "" : copperToAmountString(entry.priceOverrideCopper, currency)}
                                  />
                                  <CurrencySelect name="priceOverrideCurrency" defaultValue={currency} label="Währung des Listenpreises" />
                                </div>
                              </Field>
                              <SubmitButton variant="outline" pendingLabel="…">
                                Speichern
                              </SubmitButton>
                            </ActionForm>
                            <div className="flex items-center gap-1 lg:self-end">
                              <ActionButton
                                action={moveListItemAction.bind(null, entry.entryId, "up")}
                                variant="ghost"
                                size="icon"
                                disabled={entryIndex === 0}
                                aria-label={`„${entry.name}“ nach oben`}
                              >
                                <ArrowUp aria-hidden />
                              </ActionButton>
                              <ActionButton
                                action={moveListItemAction.bind(null, entry.entryId, "down")}
                                variant="ghost"
                                size="icon"
                                disabled={entryIndex === list.entries.length - 1}
                                aria-label={`„${entry.name}“ nach unten`}
                              >
                                <ArrowDown aria-hidden />
                              </ActionButton>
                              <ActionButton
                                action={removeListItemAction.bind(null, entry.entryId)}
                                variant="destructive"
                                size="icon"
                                aria-label={`„${entry.name}“ aus der Liste entfernen`}
                                confirm={{
                                  title: `„${entry.name}“ aus der Liste entfernen?`,
                                  description: "Der Gegenstand bleibt in der Bibliothek und in anderen Listen erhalten.",
                                  confirmLabel: "Entfernen",
                                }}
                              >
                                <X aria-hidden />
                              </ActionButton>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <details className="rounded-md border border-border bg-background/40">
                    <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold hover:text-primary">
                      Gegenstand hinzufügen · Liste umbenennen
                    </summary>
                    <div className="grid gap-5 border-t border-border p-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                      {library.length === 0 ? (
                        <p className="text-sm text-muted">
                          Die Bibliothek dieser Kampagne ist leer.{" "}
                          <Link href={`/admin/items/new?campaign=${campaign.id}`} className="text-primary hover:underline">
                            Ersten Gegenstand anlegen
                          </Link>
                        </p>
                      ) : available.length === 0 ? (
                        <p className="text-sm text-muted">Alle Gegenstände der Bibliothek sind bereits in dieser Liste.</p>
                      ) : (
                        <ActionForm action={addListItemAction.bind(null, list.id)} resetOnSuccess className="flex flex-wrap items-end gap-2">
                          <Field name="itemId" htmlFor={`add-item-${list.id}`} label="Gegenstand" className="min-w-48 flex-1">
                            <NativeSelect id={`add-item-${list.id}`} name="itemId" required defaultValue="">
                              <option value="" disabled>
                                Bitte wählen …
                              </option>
                              {available.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name} ({formatPrice(item.basePriceCopper, isCurrency(item.displayCurrency) ? item.displayCurrency : "gp")})
                                </option>
                              ))}
                            </NativeSelect>
                          </Field>
                          <Field name="quantity" htmlFor={`add-qty-${list.id}`} label="Menge" className="w-20">
                            <Input id={`add-qty-${list.id}`} name="quantity" type="number" inputMode="numeric" min={0} step={1} defaultValue={1} required />
                          </Field>
                          <Field name="priceOverrideAmount" htmlFor={`add-price-${list.id}`} label="Listenpreis (optional)" className="w-44">
                            <div className="flex gap-1">
                              <Input id={`add-price-${list.id}`} name="priceOverrideAmount" inputMode="decimal" placeholder="Grundpreis" />
                              <CurrencySelect name="priceOverrideCurrency" defaultValue="gp" label="Währung des Listenpreises" />
                            </div>
                          </Field>
                          <SubmitButton pendingLabel="…">
                            <Plus aria-hidden /> Hinzufügen
                          </SubmitButton>
                        </ActionForm>
                      )}
                      <ActionForm action={renameListAction.bind(null, list.id)} className="flex flex-wrap items-end gap-2">
                        <Field name="name" htmlFor={`rename-${list.id}`} label="Listenname" className="min-w-40 flex-1">
                          <Input id={`rename-${list.id}`} name="name" defaultValue={list.name} required maxLength={80} />
                        </Field>
                        <SubmitButton variant="outline" pendingLabel="…">
                          Umbenennen
                        </SubmitButton>
                      </ActionForm>
                    </div>
                  </details>
                </CardContent>
              </Card>
            );
          })}

          <Card>
            <CardContent className="pt-5">
              <ActionForm action={createListAction.bind(null, shop.id)} resetOnSuccess className="flex flex-wrap items-end gap-2">
                <Field name="name" htmlFor="new-list-name" label="Neue Inventarliste" className="min-w-56 flex-1">
                  <Input id="new-list-name" name="name" placeholder={`z. B. Liste ${lists.length + 1}`} required maxLength={80} />
                </Field>
                <SubmitButton pendingLabel="Wird angelegt …">
                  <ListPlus aria-hidden /> Liste anlegen
                </SubmitButton>
              </ActionForm>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Stammdaten & Intervall</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={updateShopAction.bind(null, shop.id)}>
              <ShopFields shop={shop} currentDay={campaign.currentDay} />
              <div className="mt-6">
                <SubmitButton>Speichern</SubmitButton>
              </div>
            </ActionForm>
          </CardContent>
        </Card>

        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle>Händler löschen</CardTitle>
            <CardDescription>Löscht den Händler mit allen Inventarlisten. Die Gegenstände bleiben in der Bibliothek.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActionButton
              action={deleteShopAction.bind(null, shop.id)}
              variant="destructive"
              confirm={{
                title: `„${shop.name}“ wirklich löschen?`,
                description: "Der Händler und alle seine Inventarlisten werden unwiderruflich gelöscht.",
                confirmLabel: "Händler löschen",
              }}
            >
              <Trash2 aria-hidden /> Händler löschen
            </ActionButton>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function EditShopPage({ params }: PageProps<"/admin/shops/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EditShop params={params} />
    </Suspense>
  );
}
