import type { CampaignEvent } from "@/lib/db/schema";

type Json = Record<string, unknown> | null;

/** German one-line summary of an audit event for the admin log. */
export function describeEvent(event: Pick<CampaignEvent, "eventType" | "beforeJson" | "afterJson">, shopNames: Map<string, string>): string {
  const before = event.beforeJson as Json;
  const after = event.afterJson as Json;
  const shop = () => shopNames.get(String(after?.shopId ?? before?.shopId ?? "")) ?? "Gelöschter Händler";
  switch (event.eventType) {
    case "campaign_created":
      return `Kampagne angelegt (Start an Tag ${after?.currentDay ?? "?"}).`;
    case "day_advanced":
      return `Tag ${before?.currentDay} → Tag ${after?.currentDay} (+${after?.days}); ${after?.rotatedShops ?? 0} Händler mit Sortimentswechsel.`;
    case "shop_rotated_scheduled":
      return `${shop()}: planmäßiger Sortimentswechsel (${after?.rotationsDue}×), nächster Wechsel an Tag ${after?.nextRefreshDay}.`;
    case "shop_rotated_manual":
      return `${shop()}: Sortiment manuell gewechselt (geplanter Wechsel bleibt Tag ${after?.nextRefreshDay}).`;
    case "shop_active_list_set":
      return `${shop()}: aktive Liste manuell gesetzt.`;
    case "shop_interval_changed":
      return `${shop()}: Intervall ${before?.refreshIntervalDays} → ${after?.refreshIntervalDays} Tage, nächster Wechsel an Tag ${after?.nextRefreshDay}.`;
    case "shop_created":
      return `Händler „${after?.name}“ angelegt (alle ${after?.refreshIntervalDays} Tage).`;
    case "theme_updated":
      return "Design geändert.";
    default:
      return event.eventType;
  }
}
