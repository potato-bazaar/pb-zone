"use client";

import { useEffect, useState } from "react";
import { useUserSession } from "@/components/providers/UserSessionProvider";
import { fetchSpinStatus } from "@/lib/spinApi";

/** setTimeout's longest delay (~24.8 days); anything longer fires at once. */
const MAX_TIMEOUT_MS = 2_147_483_647;
/** Long enough for the session provider's mount-time update to re-render; the tiles are still rising in. */
const FIRST_CHECK_DELAY_MS = 120;
/** The next spin should be open but the server still says used (clock skew, a slow day rollover): ask this often. */
const LATE_RETRY_MS = 30_000;
const IS_PROD = process.env.NODE_ENV === "production";

/**
 * Red dot on the Spin & Win tile while today's free spin is waiting. Shows nothing while loading, on an
 * error, once the spin is used, or (production) without the app's session. Checks again when the next spin
 * opens and when the app returns to the foreground (background webviews pause timers).
 */
export function HubSpinDot() {
  const { token, userId, userName } = useUserSession();
  const player = `${userId ?? ""}|${token ?? ""}`;
  // Same gate as Spin & Win: production only lets a session with an identity spin, so a guest has no spin to flag.
  const lockedGuest = IS_PROD && !token && !userId;
  /** The player the dot was confirmed for, so a session switch hides it until their own status answers. */
  const [readyFor, setReadyFor] = useState<string | null>(null);

  useEffect(() => {
    if (lockedGuest) return;
    let cancelled = false;
    let latest = 0;
    let reopenTimer: number | undefined;

    const check = () => {
      const request = ++latest;
      window.clearTimeout(reopenTimer);
      fetchSpinStatus({ token, userId, userName })
        .then((status) => {
          if (cancelled || request !== latest) return;
          setReadyFor(status.canSpin ? player : null);
          const opensAt = status.nextSpinAt ? Date.parse(status.nextSpinAt) : NaN;
          if (!status.canSpin && Number.isFinite(opensAt)) {
            const until = opensAt - Date.now();
            reopenTimer = window.setTimeout(check, until > 0 ? Math.min(MAX_TIMEOUT_MS, until + 1000) : LATE_RETRY_MS);
          }
        })
        .catch(() => {
          if (!cancelled && request === latest) setReadyFor(null);
        });
    };

    // On first load the session provider resolves the player in its own effect, after this one; the short wait
    // lets that land (re-running this effect) so the guest is not asked first. Stale answers are ignored anyway.
    const firstCheck = window.setTimeout(check, FIRST_CHECK_DELAY_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearTimeout(firstCheck);
      window.clearTimeout(reopenTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // A display-name update (profile hydrate) is the same player; don't re-ask.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, userId, lockedGuest]);

  if (lockedGuest || readyFor !== player) return null;

  return (
    <span className="hub-dot">
      <span className="sr-only">(free spin ready)</span>
    </span>
  );
}
