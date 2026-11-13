import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarPlus, EyeOff, Store } from "lucide-react";
import { requireAdminPage } from "@/lib/auth/session";
import { adminGetCampaign, adminListEvents, adminRotationPreview } from "@/lib/dal/admin";
import { MAX_ADVANCE_DAYS } from "@/lib/constants";
import { isUuid } from "@/lib/utils";
import { advanceDayAction } from "@/features/campaigns/actions";
import { describeEvent } from "@/features/campaigns/event-labels";
import { ActionForm, Field, SubmitButton } from "@/components/action-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Breadcrumbs, DayBadge, EmptyState, PageHeader, PageSkeleton } from "@/components/misc";

export const metadata: Metadata = { title: "Spielzeit" };

const dateTime = new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" });

async function Time({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const campaign = await adminGetCampaign(id);
  if (!campaign) notFound();
  const [preview, events] = await Promise.all([adminRotationPreview(campaign.id, campaign.currentDay), adminListEvents(campaign.id)]);
  const shopNames = new Map(preview.map((row) => [row.shopId, row.shopName]));
  const action = advanceDayAction.bind(null, campaign.id);

  return (
    <>
      <PageHeader
        eyebrow={
          <Breadcrumbs
            items={[
              { label: "Kampagnen", href: "/admin/campaigns" },
              { label: campaign.name, href: `/admin/campaigns/${campaign.id}` },
              { label: "Spielzeit" },
            ]}
          />
        }
        title="Spielzeit"
        description="Spieltage schreiten nur hier voran – nie automatisch durch echte Zeit."
        actions={<DayBadge day={campaign.currentDay} />}
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Tage voranschreiten</CardTitle>
            <CardDescription>
              Alle fälligen Sortimentswechsel dieser Kampagne werden dabei in einem Schritt ausgeführt – auch mehrere pro Händler bei
              großen Sprüngen. Zurückstellen ist nicht möglich.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <ActionForm action={action}>
              <input type="hidden" name="expectedCurrentDay" value={campaign.currentDay} />
              <p className="mb-2 text-sm font-semibold">Schnellauswahl</p>
              <div className="flex flex-wrap gap-2">
                {[1, 3, 7].map((days) => (
                  <SubmitButton key={days} name="days" value={days} variant="outline" pendingLabel={`+${days} …`}>
                    <CalendarPlus aria-hidden /> +{days} {days === 1 ? "Tag" : "Tage"}
                  </SubmitButton>
                ))}
              </div>
            </ActionForm>
            <ActionForm action={action} resetOnSuccess>
              <input type="hidden" name="expectedCurrentDay" value={campaign.currentDay} />
              <Field name="days" htmlFor="custom-days" label="Eigene Anzahl an Tagen">
                <div className="flex gap-2">
                  <Input
                    id="custom-days"
                    name="days"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={MAX_ADVANCE_DAYS}
                    step={1}
                    placeholder="z. B. 14"
                    required
                    className="max-w-40"
                  />
                  <SubmitButton pendingLabel="Wird ausgeführt …">Voranschreiten</SubmitButton>
                </div>
              </Field>
            </ActionForm>
          </CardContent>
        </Card>

        <section aria-labelledby="preview-heading">
          <h2 id="preview-heading" className="mb-3 text-xl font-semibold">
            Anstehende Sortimentswechsel
          </h2>
          {preview.length === 0 ? (
            <EmptyState icon={<Store />} title="Noch keine Händler" description="Lege Händler an, um ihre Wechsel hier zu sehen." />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border bg-surface/95">
              <table className="w-full min-w-[46rem] text-left text-[0.95rem]">
                <thead className="border-b border-border text-sm text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Händler</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Intervall</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Nächster Wechsel</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Aktive Liste</th>
                    {preview[0].whatIf.map((w) => (
                      <th key={w.days} scope="col" className="px-3 py-3 text-center font-semibold">
                        bei +{w.days}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {preview.map((row) => (
                    <tr key={row.shopId}>
                      <th scope="row" className="px-4 py-3 font-semibold">
                        <Link href={`/admin/shops/${row.shopId}`} className="hover:text-primary hover:underline">
                          {row.shopName}
                        </Link>
                        {!row.isVisible && (
                          <Badge variant="muted" className="ml-2">
                            <EyeOff aria-hidden /> versteckt
                          </Badge>
                        )}
                      </th>
                      <td className="px-4 py-3 tabular-nums">alle {row.refreshIntervalDays} T.</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-primary tabular-nums">Tag {row.nextRefreshDay}</span>
                        <span className="ml-2 text-sm text-muted">
                          {row.daysUntilRefresh === 0 ? "fällig" : `in ${row.daysUntilRefresh} T.`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {row.listCount === 0 ? (
                          <span className="text-muted">keine Listen</span>
                        ) : (
                          <>
                            {row.activeListName ?? "–"} <span className="text-sm text-muted">({row.listCount})</span>
                          </>
                        )}
                      </td>
                      {row.whatIf.map((w) => (
                        <td key={w.days} className="px-3 py-3 text-center">
                          {w.rotationsDue === 0 ? (
                            <span className="text-muted" aria-label="kein Wechsel">–</span>
                          ) : (
                            <span title={w.toListName ? `danach aktiv: ${w.toListName}` : undefined}>
                              <span className="font-semibold tabular-nums">{w.rotationsDue}×</span>
                              {w.toListName && <span className="block text-xs text-muted">→ {w.toListName}</span>}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-sm text-muted">
            Die Spalten „bei +N“ zeigen, wie viele planmäßige Wechsel ein Sprung um N Tage auslösen würde und welche Liste danach aktiv wäre.
          </p>
        </section>

        <section aria-labelledby="log-heading">
          <h2 id="log-heading" className="mb-3 text-xl font-semibold">
            Protokoll
          </h2>
          {events.length === 0 ? (
            <p className="text-muted">Noch keine Einträge.</p>
          ) : (
            <ol className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface/95 text-[0.95rem]">
              {events.map((event) => (
                <li key={event.id} className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-2.5">
                  <time dateTime={event.createdAt.toISOString()} className="w-32 shrink-0 text-sm text-muted tabular-nums">
                    {dateTime.format(event.createdAt)}
                  </time>
                  <span className="min-w-0 flex-1">{describeEvent(event, shopNames)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}

export default function TimePage({ params }: PageProps<"/admin/campaigns/[id]/time">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Time params={params} />
    </Suspense>
  );
}
