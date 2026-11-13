import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { RARITY_LABELS, type Rarity } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="fantasy-page-header mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-sm text-muted">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Brotkrumen" className="flex flex-wrap items-center gap-1">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-1">
          {index > 0 && <ChevronRight className="size-3.5 opacity-60" aria-hidden />}
          {item.href ? (
            <Link href={item.href} className="hover:text-primary hover:underline">
              {item.label}
            </Link>
          ) : (
            <span aria-current="page">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="fantasy-panel flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-strong bg-surface/60 px-6 py-12 text-center">
      {icon && <div className="text-primary [&_svg]:size-9">{icon}</div>}
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="max-w-md text-muted">{description}</p>}
      {action}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl animate-pulse px-4 py-10" role="status" aria-label="Inhalt wird geladen">
      <div className="h-8 w-56 rounded bg-surface-2" />
      <div className="mt-3 h-4 w-80 max-w-full rounded bg-surface-2" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 rounded-lg bg-surface" />
        ))}
      </div>
    </div>
  );
}

/** Fixed, theme-independent rarity colours; the label always carries the meaning too. */
const RARITY_COLORS: Record<Rarity, string> = {
  common: "#b8b2a7",
  uncommon: "#5fbf7a",
  rare: "#5b9cf0",
  very_rare: "#b07cf0",
  legendary: "#f0a03c",
  artifact: "#ef6a5b",
  unknown: "#8d99a6",
};

export function RarityBadge({ rarity, className }: { rarity: string; className?: string }) {
  const key = (rarity in RARITY_LABELS ? rarity : "unknown") as Rarity;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-background/50 px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        className,
      )}
    >
      <span className="size-2 rounded-full" style={{ backgroundColor: RARITY_COLORS[key] }} aria-hidden />
      {RARITY_LABELS[key]}
    </span>
  );
}

export function DayBadge({ day, className }: { day: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1.5 rounded-md border border-primary/50 bg-primary/10 px-3 py-1 font-display text-primary",
        className,
      )}
    >
      <span className="text-xs uppercase tracking-widest">Tag</span>
      <span className="text-lg font-bold tabular-nums">{day}</span>
    </span>
  );
}
