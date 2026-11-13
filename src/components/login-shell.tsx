import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import { ScrollText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function LoginShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <main id="inhalt" className="game-login fantasy-login campaign-backdrop flex flex-1 items-center justify-center px-4 py-12">
      <div className="game-login-toggle"><ThemeToggle /></div>
      <div className="game-login-spread">
        <div className="game-login-illustration" aria-hidden>
          <div className="game-login-moon">✦</div>
          <Image src="/images/game/merchant-alchemist.webp" width={1000} height={940} alt="" unoptimized preload />
          <p>Jedes Abenteuer<br /><span>beginnt mit einer Geschichte.</span></p>
        </div>
        <Card className="game-login-parchment w-full max-w-sm">
          <CardContent className="p-7">
            <div className="mb-6 flex flex-col items-center gap-3 text-center">
              <span className="game-brand-seal"><ScrollText className="size-7" aria-hidden /></span>
              <p className="game-eyebrow">Die Chroniken deiner Spielrunde</p>
              <h1 className="text-2xl font-semibold">{title}</h1>
              <p className="text-muted">{description}</p>
            </div>
            <hr className="ornament-rule mb-6" />
            {children}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
