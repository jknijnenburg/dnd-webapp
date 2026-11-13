import { ScrollText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function LoginShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <main
      id="inhalt"
      className="campaign-backdrop flex flex-1 items-center justify-center px-4 py-12"
      style={{ "--bg-image": 'url("/images/backgrounds/parchment-dark.svg")' } as React.CSSProperties}
    >
      <Card className="w-full max-w-sm">
        <CardContent className="p-7">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <span className="flex size-14 items-center justify-center rounded-full border border-primary/60 bg-primary/10 text-primary">
              <ScrollText className="size-7" aria-hidden />
            </span>
            <h1 className="text-2xl font-semibold">{title}</h1>
            <p className="text-muted">{description}</p>
          </div>
          <hr className="ornament-rule mb-6" />
          {children}
        </CardContent>
      </Card>
    </main>
  );
}
