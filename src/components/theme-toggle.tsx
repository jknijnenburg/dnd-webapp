"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { APPEARANCE_STORAGE_KEY } from "@/lib/appearance";
import { Button } from "@/components/ui/button";

const CHANGE_EVENT = "campaign-hub-appearance-change";
const getSnapshot = () => document.documentElement.dataset.theme === "dark";
const getServerSnapshot = () => false;

function subscribe(onChange: () => void) {
  const system = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = () => {
    let preference;
    try { preference = localStorage.getItem(APPEARANCE_STORAGE_KEY); } catch {}
    if (preference !== "light" && preference !== "dark") {
      document.documentElement.dataset.theme = system.matches ? "dark" : "light";
      onChange();
    }
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key !== APPEARANCE_STORAGE_KEY && event.key !== null) return;
    const dark = event.newValue === "dark" || (event.newValue !== "light" && system.matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  system.addEventListener("change", onSystemChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
    system.removeEventListener("change", onSystemChange);
  };
}

export function useDarkMode() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function ThemeToggle() {
  const dark = useDarkMode();
  function toggle() {
    const next = getSnapshot() ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(APPEARANCE_STORAGE_KEY, next); } catch {}
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="shrink-0"
      aria-label="Dunkelmodus"
      aria-pressed={dark}
      title={dark ? "Zum hellen Pergament wechseln" : "Zum dunklen Pergament wechseln"}
      onClick={toggle}
    >
      <Sun className="theme-icon-sun" aria-hidden />
      <Moon className="theme-icon-moon" aria-hidden />
    </Button>
  );
}
