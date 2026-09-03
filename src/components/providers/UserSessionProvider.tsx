"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_USER_NAME,
  fetchUserProfile,
  getDefaultSession,
  isGuestSession,
  resolveClientSession,
  storeSession,
  type PbZoneSession,
} from "@/lib/pbZoneAuth";

const UserSessionContext = createContext<PbZoneSession>(getDefaultSession());
const POLL_MS = 300;
const POLL_ATTEMPTS = 20;

function stripAuthParamsFromUrl() {
  const url = new URL(window.location.href);
  let changed = false;

  for (const key of [
    "userName",
    "name",
    "token",
    "authToken",
    "userId",
    "id",
  ]) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }

  if (changed) {
    window.history.replaceState(
      {},
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }
}

function parseWebViewMessage(raw: unknown): Partial<PbZoneSession> | null {
  if (!raw) return null;

  try {
    const data =
      typeof raw === "string"
        ? (JSON.parse(raw) as Record<string, unknown>)
        : (raw as Record<string, unknown>);

    if (!data || typeof data !== "object") return null;

    if (data.type === "PB_ZONE_SESSION" && data.payload) {
      const payload = data.payload as Record<string, unknown>;
      return {
        userName:
          (typeof payload.userName === "string" && payload.userName) ||
          undefined,
        token:
          (typeof payload.token === "string" && payload.token) ||
          (typeof payload.authToken === "string" && payload.authToken) ||
          null,
        userId:
          payload.userId != null
            ? String(payload.userId)
            : payload.id != null
              ? String(payload.id)
              : null,
      };
    }

    const userName =
      (typeof data.userName === "string" && data.userName) ||
      (typeof data.name === "string" && data.name) ||
      undefined;

    const token =
      (typeof data.token === "string" && data.token) ||
      (typeof data.authToken === "string" && data.authToken) ||
      null;

    const userId =
      data.userId != null
        ? String(data.userId)
        : data.id != null
          ? String(data.id)
          : null;

    if (!userName && !token && !userId) return null;

    return { userName, token, userId };
  } catch {
    return null;
  }
}

export function UserSessionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [session, setSession] = useState<PbZoneSession>(getDefaultSession());
  const pollCount = useRef(0);
  const profileFetchedFor = useRef<string | null>(null);

  const commitSession = useCallback((resolved: PbZoneSession) => {
    setSession(resolved);

    if (isGuestSession(resolved)) return;

    storeSession(resolved);
    stripAuthParamsFromUrl();

    console.info("[PB Zone] session:", {
      userName: resolved.userName,
      userId: resolved.userId,
      hasToken: Boolean(resolved.token),
    });
  }, []);

  const hydrateSession = useCallback(() => {
    const resolved = resolveClientSession(window.location.search);
    commitSession(resolved);
    return resolved;
  }, [commitSession]);

  // Fetch name from API whenever we get a token
  useEffect(() => {
    const token = session.token;
    if (!token || profileFetchedFor.current === token) return;

    profileFetchedFor.current = token;

    void fetchUserProfile(token).then((profile) => {
      if (!profile?.userName) return;

      setSession((current) => {
        if (current.userName === profile.userName) return current;

        const updated = { ...current, userName: profile.userName };
        storeSession(updated);
        console.info("[PB Zone] name from API:", profile.userName);
        return updated;
      });
    });
  }, [session.token]);

  useEffect(() => {
    hydrateSession();

    pollCount.current = 0;
    const timer = window.setInterval(() => {
      pollCount.current += 1;
      const next = resolveClientSession(window.location.search);

      if (!isGuestSession(next)) {
        commitSession(next);
      }

      if (
        pollCount.current >= POLL_ATTEMPTS ||
        (next.token && next.userName !== DEFAULT_USER_NAME)
      ) {
        window.clearInterval(timer);
      }
    }, POLL_MS);

    const onSessionReady = () => {
      commitSession(resolveClientSession(window.location.search));
    };

    const onMessage = (event: MessageEvent) => {
      const partial = parseWebViewMessage(event.data);
      if (!partial) return;

      const merged = resolveClientSession(window.location.search);
      commitSession({
        ...merged,
        userName: partial.userName ?? merged.userName,
        token: partial.token ?? merged.token,
        userId: partial.userId ?? merged.userId,
      });
    };

    window.addEventListener("pbZoneSessionReady", onSessionReady);
    window.addEventListener("message", onMessage);
    document.addEventListener("message", onMessage as EventListener);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pbZoneSessionReady", onSessionReady);
      window.removeEventListener("message", onMessage);
      document.removeEventListener("message", onMessage as EventListener);
    };
  }, [hydrateSession, commitSession, pathname]);

  const value = useMemo(() => session, [session]);

  return (
    <UserSessionContext.Provider value={value}>
      {children}
    </UserSessionContext.Provider>
  );
}

export function useUserSession() {
  return useContext(UserSessionContext);
}
