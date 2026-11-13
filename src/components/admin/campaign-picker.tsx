import Link from "next/link";
import { cn } from "@/lib/utils";

/** Pills to pick the campaign whose shops / items are managed. */
export function CampaignPicker({
  campaigns,
  currentId,
  basePath,
}: {
  campaigns: { id: string; name: string }[];
  currentId: string;
  basePath: string;
}) {
  return (
    <nav aria-label="Kampagne auswählen" className="mb-6 flex flex-wrap gap-2">
      {campaigns.map((c) => (
        <Link
          key={c.id}
          href={`${basePath}?campaign=${c.id}`}
          aria-current={c.id === currentId ? "page" : undefined}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
            c.id === currentId
              ? "border-primary bg-primary/15 text-primary"
              : "border-border text-muted hover:border-border-strong hover:text-foreground",
          )}
        >
          {c.name}
        </Link>
      ))}
    </nav>
  );
}

export function pickCampaign<T extends { id: string }>(campaigns: T[], requested: string | undefined): T | undefined {
  return campaigns.find((c) => c.id === requested) ?? campaigns[0];
}
