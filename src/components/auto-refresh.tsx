"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps an open player page fresh without WebSockets: re-fetches the server
 * components every `intervalSeconds` while the tab is visible, and immediately
 * when the tab becomes visible / focused again. Hidden tabs do nothing.
 */
export function AutoRefresh({ intervalSeconds = 45 }: { intervalSeconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    let lastRefresh = Date.now();

    const refresh = () => {
      lastRefresh = Date.now();
      router.refresh();
    };
    const start = () => {
      if (timer === undefined) timer = setInterval(refresh, intervalSeconds * 1000);
    };
    const stop = () => {
      clearInterval(timer);
      timer = undefined;
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        // Avoid a burst when visibilitychange and focus fire together.
        if (Date.now() - lastRefresh > 5000) refresh();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
    };
  }, [router, intervalSeconds]);

  return null;
}
