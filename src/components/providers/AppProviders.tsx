"use client";

import type { ReactNode } from "react";
import { PbCoinsProvider } from "@/components/providers/PbCoinsProvider";
import { UserSessionProvider } from "@/components/providers/UserSessionProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <UserSessionProvider>
      <PbCoinsProvider>{children}</PbCoinsProvider>
    </UserSessionProvider>
  );
}
