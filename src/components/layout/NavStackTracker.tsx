"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { currentPath, notePopState, recordPath, settleBack } from "@/lib/navStack";

/** Feeds route changes into the in-app back stack (see lib/navStack). Renders nothing. */
export function NavStackTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const onPopState = () => {
      // Games pop their own in-page entries on the same URL; only route changes count.
      if (window.location.pathname !== currentPath()) notePopState();
      settleBack();
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    recordPath(pathname);
    settleBack();
  }, [pathname]);

  return null;
}
