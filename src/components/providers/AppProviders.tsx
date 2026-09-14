"use client";

import type { ReactNode } from "react";
import { PbCoinsProvider } from "@/components/providers/PbCoinsProvider";
import { PbPointsProvider } from "@/components/providers/PbPointsProvider";
import { UserSessionProvider } from "@/components/providers/UserSessionProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <UserSessionProvider>
      <PbCoinsProvider>
        <PbPointsProvider>{children}</PbPointsProvider>
      </PbCoinsProvider>
    </UserSessionProvider>
  );
}
