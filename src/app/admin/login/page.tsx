import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { loginAdminAction } from "@/lib/auth/actions";
import { requirePlayerPage } from "@/lib/auth/session";
import { LoginForm } from "@/components/login-form";
import { LoginShell } from "@/components/login-shell";

export const metadata: Metadata = { title: "Admin-Anmeldung" };

async function AdminLoginGate() {
  // The admin login is only shown after the group login.
  await requirePlayerPage();
  return <LoginForm action={loginAdminAction} label="Admin-Passwort" submitLabel="Als Spielleitung anmelden" />;
}

export default function AdminLoginPage() {
  return (
    <LoginShell title="Spielleitung" description="Zusätzliche Anmeldung für die Verwaltung der Kampagnen.">
      <Suspense fallback={<div className="h-40" />}>
        <AdminLoginGate />
      </Suspense>
      <p className="mt-5 text-center text-sm">
        <Link href="/campaigns" className="text-muted hover:text-primary hover:underline">
          Zurück zu den Kampagnen
        </Link>
      </p>
    </LoginShell>
  );
}
