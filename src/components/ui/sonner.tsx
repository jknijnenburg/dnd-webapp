"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      toastOptions={{
        style: {
          background: "#221d19",
          color: "#f3ead7",
          border: "1px solid #5c4a2a",
          fontFamily: "var(--font-body)",
          fontSize: "0.95rem",
        },
      }}
    />
  );
}
