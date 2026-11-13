import Link from "next/link";
import { LogOut, ScrollText, Shield } from "lucide-react";
import { logoutAction } from "@/lib/auth/actions";
import { getSession } from "@/lib/auth/session";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

/** Top bar shared by player and admin areas. Admin entry points only render for admins. */
export async function SiteHeader({ children }: { children?: React.ReactNode }) {
  const session = await getSession();
  const isAdmin = session?.role === "admin";
  return (
    <header className="fantasy-header sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
        <Link href="/campaigns" className="flex shrink-0 items-center gap-2 font-display text-lg font-semibold text-primary">
          <ScrollText className="size-5" aria-hidden />
          <span className="hidden sm:inline">Kampagnen-Hub</span>
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
        {isAdmin && (
          <Button asChild variant="outline" size="sm">
            <Link href="/admin">
              <Shield aria-hidden />
              <span className="hidden sm:inline">Verwaltung</span>
              <span className="sr-only sm:hidden">Verwaltung</span>
            </Link>
          </Button>
        )}
        <ThemeToggle />
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" size="sm">
            <LogOut aria-hidden />
            <span className="hidden sm:inline">Abmelden</span>
            <span className="sr-only sm:hidden">Abmelden</span>
          </Button>
        </form>
      </div>
    </header>
  );
}

export function SiteFooter({ showAdminLink = true }: { showAdminLink?: boolean }) {
  return (
    <footer className="mx-auto mt-auto w-full max-w-6xl px-4 py-8 text-sm text-muted">
      <hr className="ornament-rule mb-4" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>Privates Hilfsmittel für unsere Spielrunde.</span>
        {showAdminLink && (
          <Link href="/admin" className="hover:text-primary hover:underline">
            Spielleitung
          </Link>
        )}
      </div>
    </footer>
  );
}
