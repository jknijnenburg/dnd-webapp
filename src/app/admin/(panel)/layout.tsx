import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Eye, ShieldOff } from "lucide-react";
import { leaveAdminAction } from "@/lib/auth/actions";
import { requireAdminPage } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/misc";
import { NavLink } from "@/components/nav-link";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: { default: "Verwaltung", template: "%s · Verwaltung · Kampagnen-Hub" } };

const NAV = [
  { href: "/admin", label: "Übersicht", exact: true },
  { href: "/admin/campaigns", label: "Kampagnen" },
  { href: "/admin/shops", label: "Händler" },
  { href: "/admin/items", label: "Gegenstände" },
];

async function AdminFrame({ children }: { children: React.ReactNode }) {
  // Checked here for the whole admin area – and again in every data access function and action.
  await requireAdminPage();
  return (
    <>
      <SiteHeader>
        <span className="rounded-full border border-primary/50 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
          Spielleitung
        </span>
      </SiteHeader>
      <div className="border-b border-border bg-surface/60">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 px-4">
          <nav aria-label="Verwaltung" className="-mb-px flex overflow-x-auto">
            {NAV.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                exact={item.exact}
                className="whitespace-nowrap border-b-2 border-transparent px-3 py-3 text-[0.95rem] font-semibold text-muted transition-colors hover:text-foreground"
                activeClassName="border-primary text-primary"
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-1 py-1.5">
            <Button asChild variant="ghost" size="sm">
              <Link href="/campaigns">
                <Eye aria-hidden /> Spieleransicht
              </Link>
            </Button>
            <form action={leaveAdminAction}>
              <Button type="submit" variant="ghost" size="sm">
                <ShieldOff aria-hidden /> Admin-Modus beenden
              </Button>
            </form>
          </div>
        </div>
      </div>
      <main id="inhalt" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminFrame>{children}</AdminFrame>
    </Suspense>
  );
}
