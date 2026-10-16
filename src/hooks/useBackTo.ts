"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { claimBack, holdBack, noteReplace, planUp, stepBack } from "@/lib/navStack";

/** Give up waiting for a traversal's popstate. */
const LAND_TIMEOUT_MS = 1500;

/**
 * Back ("up") to `href`. Pops history to it when it is already there (skipping a game's in-page entries
 * and any screens since); otherwise steps back to just above the hub (or PB Zone's first entry) and
 * replaces that entry with `href`. Taps while a back is still on its way are ignored. See lib/navStack.
 */
export function useBackTo(href = "/home") {
  const router = useRouter();

  return useCallback(() => {
    const plan = planUp(href.split(/[?#]/)[0]);
    if (!plan.replace) {
      stepBack(plan.steps);
      return;
    }

    const replaceHere = () => {
      noteReplace();
      router.replace(href);
    };
    if (plan.steps === 0) {
      if (claimBack()) replaceHere();
      return;
    }
    // Warm the destination so the screen we step through shows for as short a time as possible.
    router.prefetch(href);
    if (!stepBack(plan.steps)) return;

    const onLand = () => {
      window.removeEventListener("popstate", onLand);
      window.clearTimeout(timer);
      holdBack();
      replaceHere();
    };
    const timer = window.setTimeout(() => window.removeEventListener("popstate", onLand), LAND_TIMEOUT_MS);
    window.addEventListener("popstate", onLand);
  }, [router, href]);
}
