import type { Metadata } from "next";
import { Suspense } from "react";
import { loginPlayerAction } from "@/lib/auth/actions";
import { LoginForm } from "@/components/login-form";
import { LoginShell } from "@/components/login-shell";

export const metadata: Metadata = { title: "Anmelden" };

export default function LoginPage() {
  return (
    <LoginShell title="Kampagnen-Hub" description="Bitte gib das Passwort eurer Spielrunde ein.">
      <Suspense fallback={<div className="h-40" />}>
        <LoginForm action={loginPlayerAction} label="Gruppenpasswort" submitLabel="Eintreten" />
      </Suspense>
    </LoginShell>
  );
}
