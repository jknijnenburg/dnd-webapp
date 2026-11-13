"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/misc";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="inhalt" className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-16">
      <EmptyState
        icon={<TriangleAlert />}
        title="Etwas ist schiefgelaufen"
        description={
          <>
            Die Seite konnte nicht geladen werden. Möglicherweise ist die Datenbank gerade nicht erreichbar oder die
            Server-Konfiguration unvollständig.
            {error.digest && <span className="mt-2 block text-xs">Fehler-ID: {error.digest}</span>}
          </>
        }
        action={<Button onClick={reset}>Erneut versuchen</Button>}
      />
    </main>
  );
}
