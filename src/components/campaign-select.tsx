"use client";

import { useRouter } from "next/navigation";
import { NativeSelect } from "@/components/ui/input";

/** Compact campaign switcher for small screens. */
export function CampaignSelect({ campaigns, current }: { campaigns: { slug: string; name: string }[]; current: string }) {
  const router = useRouter();
  return (
    <NativeSelect
      aria-label="Kampagne wechseln"
      value={current}
      onChange={(event) => router.push(`/campaigns/${event.target.value}`)}
      className="h-9 max-w-[60vw]"
    >
      {campaigns.map((c) => (
        <option key={c.slug} value={c.slug}>
          {c.name}
        </option>
      ))}
    </NativeSelect>
  );
}
