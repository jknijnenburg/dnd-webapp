import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/misc";

export default function NotFound() {
  return (
    <main id="inhalt" className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-16">
      <EmptyState
        icon={<Compass />}
        title="Hier ist nichts zu finden"
        description="Diese Seite existiert nicht (mehr) oder wurde verschoben."
        action={
          <Button asChild>
            <Link href="/campaigns">Zur Kampagnenübersicht</Link>
          </Button>
        }
      />
    </main>
  );
}
