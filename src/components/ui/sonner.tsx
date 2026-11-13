"use client";

import { Toaster as Sonner } from "sonner";
import { useDarkMode } from "@/components/theme-toggle";

export function Toaster() {
  const dark = useDarkMode();
  return (
    <Sonner
      theme={dark ? "dark" : "light"}
      position="bottom-right"
      toastOptions={{
        style: {
          background: "var(--surface)",
          color: "var(--foreground)",
          border: "2px solid var(--border-strong)",
          fontFamily: "var(--font-body)",
          fontSize: "0.95rem",
        },
      }}
    />
  );
}
