"use client";

import type { ReactNode } from "react";
import { NavStackTracker } from "@/components/layout/NavStackTracker";
import { PbCoinsProvider } from "@/components/providers/PbCoinsProvider";
import { PbPointsProvider } from "@/components/providers/PbPointsProvider";
import { UserSessionProvider } from "@/components/providers/UserSessionProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <UserSessionProvider>
      <PbCoinsProvider>
        <PbPointsProvider>
          <NavStackTracker />
          {children}
        </PbPointsProvider>
      </PbCoinsProvider>
    </UserSessionProvider>
  );
}
