import Image from "next/image";
import { cn } from "@/lib/utils";

/** Artwork stays decorative; the scene's real heading and links remain accessible HTML. */
export function GameScene({ title, description, eyebrow = "Ein neues Kapitel", children, className, character = true }: {
  title: string;
  description?: React.ReactNode;
  eyebrow?: string;
  children?: React.ReactNode;
  className?: string;
  character?: boolean;
}) {
  return (
    <section className={cn("game-scene", !character && "game-scene-landscape", className)}>
      <div className="game-scene-landscape-art" aria-hidden />
      <div className="game-scene-runes" aria-hidden>✦</div>
      <div className="game-scene-copy">
        <p className="game-eyebrow"><span aria-hidden>◆</span> {eyebrow}</p>
        <h1>{title}</h1>
        {description && <div className="game-scene-description">{description}</div>}
        {children && <div className="game-scene-actions">{children}</div>}
      </div>
      {character && <Image className="game-scene-character" src="/images/game/merchant-alchemist.webp" width={1000} height={940} alt="" unoptimized preload />}
      <span className="game-scene-pin" aria-hidden>✧</span>
    </section>
  );
}
