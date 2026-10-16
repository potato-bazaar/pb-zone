/**
 * "Up" navigation that keeps the phone's back button and ours in step: hub → game → back lands on the
 * hub, and back again leaves PB Zone instead of looping into the game. A back pops history to the parent
 * when it is already there; otherwise it steps back to just above the hub (or to PB Zone's first entry)
 * and replaces that entry with the parent, so nothing we left stays underneath.
 *
 * Uses the Navigation API when the browser has it; otherwise a pathname stack in client memory, fed by
 * <NavStackTracker />. Games push in-page entries on their own URL for their phases (quiz play, match
 * how-to/result) and count them in `history.state.pbInPage`.
 */

const MAX_DEPTH = 50;
const HUB = "/home";

/** A tap this soon after a back landed is the second half of a double tap, not a new back. */
const SETTLE_MS = 350;

let stack: string[] = [];
let popPending = false;
let replacePending = false;
/** A back is on its way; further taps wait until it lands (fast double taps, a game's own back in flight). */
let backPending = false;
let backPendingTimer: number | undefined;
let lastLandedAt = -Infinity;

/**
 * Browser back/forward changed the route. Reconciled right away from the URL: an "up" may replace the
 * entry it lands on before React ever renders that path.
 */
export function notePopState() {
  const behind = stack.lastIndexOf(window.location.pathname, stack.length - 2);
  if (behind >= 0) stack = stack.slice(0, behind + 1);
  else popPending = true;
}

/** The next recorded path replaces the current entry (router.replace). */
export function noteReplace() {
  replacePending = true;
}

/** Pathname the stack thinks we're on. */
export function currentPath(): string | undefined {
  return stack[stack.length - 1];
}

export function recordPath(pathname: string) {
  const top = stack[stack.length - 1];
  if (pathname !== top) {
    const behind = stack.lastIndexOf(pathname, stack.length - 2);
    if (popPending && behind >= 0) {
      stack = stack.slice(0, behind + 1);
    } else if (replacePending && stack.length > 0) {
      stack[stack.length - 1] = pathname;
    } else {
      stack.push(pathname);
      if (stack.length > MAX_DEPTH) stack = stack.slice(-MAX_DEPTH);
    }
  }
  popPending = false;
  replacePending = false;
}

/** A traversal or route change landed: back taps work again (after a short settle). */
export function settleBack() {
  if (backPending) lastLandedAt = performance.now();
  backPending = false;
  window.clearTimeout(backPendingTimer);
}

/** Claims the next back; false while another one is on its way or has only just landed. */
export function claimBack(): boolean {
  if (backPending || performance.now() - lastLandedAt < SETTLE_MS) return false;
  holdBack();
  return true;
}

/** Marks a back as on its way without checking (the replace that completes an "up"). */
export function holdBack() {
  backPending = true;
  window.clearTimeout(backPendingTimer);
  backPendingTimer = window.setTimeout(settleBack, 1000);
}

/** history.go(-steps), unless a back is already on its way. Games use it for their in-page steps too. */
export function stepBack(steps = 1): boolean {
  if (!claimBack()) return false;
  window.history.go(-steps);
  return true;
}

type NavigationEntryLike = { url: string | null; sameDocument?: boolean };
type NavigationLike = {
  currentEntry: { index: number } | null;
  entries: () => NavigationEntryLike[];
};

/** Pop `steps` entries; then, if `replace`, replace the entry we land on with the parent. */
export type UpPlan = { steps: number; replace: boolean };

/** How to go "up" to `path` from here (see the module comment). */
export function planUp(path: string): UpPlan {
  const nav = (window as Window & { navigation?: NavigationLike }).navigation;
  if (nav?.currentEntry && typeof nav.entries === "function") {
    const entries = nav.entries();
    const current = nav.currentEntry.index;
    let anchor = 0;
    for (let i = current - 1; i >= 0; i--) {
      const found = pathOf(entries[i]?.url);
      if (found === path) return { steps: current - i, replace: false };
      // The replace can only follow a traversal within this document: never step into an older one.
      if (found === HUB || found === null || entries[i]?.sameDocument === false) {
        anchor = i + 1;
        break;
      }
    }
    return { steps: current - anchor, replace: true };
  }

  // Without the Navigation API the stack only knows this entry's in-page count, so it never steps across
  // another game's route (its in-page entries are uncounted).
  const top = stack.length - 1;
  const inPage = inPageEntries();
  let anchor = 0;
  for (let i = top - 1; i >= 0; i--) {
    if (stack[i] === path) return { steps: top - i + inPage, replace: false };
    if (stack[i] === HUB || stack[i].startsWith("/games/")) {
      anchor = i + 1;
      break;
    }
  }
  return { steps: Math.max(0, top - anchor) + inPage, replace: true };
}

function pathOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).pathname;
  } catch {
    return null;
  }
}

function inPageEntries() {
  return Number((window.history.state as { pbInPage?: unknown } | null)?.pbInPage) || 0;
}
