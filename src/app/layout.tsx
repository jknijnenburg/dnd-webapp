import type { Metadata, Viewport } from "next";
import "@fontsource-variable/cinzel";
import "@fontsource-variable/crimson-pro";
import "@fontsource-variable/cormorant";
import "@fontsource-variable/inter";
import "./globals.css";
import "./game-shell.css";
import { APPEARANCE_INIT_SCRIPT } from "@/lib/appearance";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: { default: "Kampagnen-Hub", template: "%s · Kampagnen-Hub" },
  description: "Privater Händler- und Kampagnen-Hub für unsere Spielrunde.",
  // Keeps crawlers away; this is NOT access control (see proxy.ts and the data access layer).
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export const viewport: Viewport = {
  themeColor: "#efdcaf",
  colorScheme: "light dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_INIT_SCRIPT }} />
      </head>
      <body className="theme-scope flex min-h-full flex-col">
        <a
          href="#inhalt"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
        >
          Zum Inhalt springen
        </a>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
