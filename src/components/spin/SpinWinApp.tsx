"use client";

import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type Ref } from "react";
import { haptic, sounds } from "@/components/crush/render/sound";
import { BackToHub } from "@/components/layout/BackToHub";
import { usePbCoins } from "@/components/providers/PbCoinsProvider";
import { useUserSession } from "@/components/providers/UserSessionProvider";
import { WinBurst } from "@/components/quiz/QuizWinEffects";
import {
  SpinWheel,
  WHEEL_ART,
  WheelMotion,
  landingJitter,
  mod360,
  restAngle,
  type WheelLights,
  type WheelSpotlight,
} from "@/components/spin/SpinWheel";
import { QuizApiError, type QuizAuth } from "@/lib/quizApi";
import {
  DEFAULT_SPIN_SEGMENTS,
  clearPendingSpinRequest,
  fetchSpinStatus,
  pendingSpinRequestId,
  spin,
  type SpinLast,
  type SpinResult,
  type SpinSegment,
  type SpinStatus,
} from "@/lib/spinApi";

/** Before any spin the wheel rests like the hub tile: wedge 1 (the open book on the v1 wheel) under the pin. */
const REST_INDEX = 1;
const STATUS_TIMEOUT_MS = 12_000;
/** No answer to a spin by then: stop the wheel and offer a retry (same request id, so it can't pay twice). */
const SPIN_TIMEOUT_MS = 15_000;
/** Production guests get this long for the app's session to arrive before we say "open it from the app". */
const GUEST_GRACE_MS = 2500;
/** The balance updates as the first coins reach the pill (coins take 0.9s, see .home-coin-fly). */
const COIN_LAND_MS = 750;
const IS_PROD = process.env.NODE_ENV === "production";
const CONFETTI = ["#FFD84A", "#F39A12", "#2F9E4F", "#FFFFFF", "#F2862E", "#1E7A3E"];

type Flow =
  | { kind: "idle" }
  | { kind: "spinning" }
  /** The spin's answer never came (network / 5xx / timeout); the request id is kept for the retry. */
  | { kind: "lost" }
  | { kind: "result"; result: SpinResult; jackpot: boolean; spot: WheelSpotlight | null };

type Phase = "loading" | "ready" | "spinning" | "result" | "lost" | "used" | "unavailable" | "guest";

type FlyingCoin = { id: number; x: number; y: number; sx: number; sy: number; dx: number; dy: number; delay: number };

function formatCountdown(ms: number) {
  const totalMin = Math.max(0, Math.ceil(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const coinsText = (n: number) => `${n.toLocaleString("en-IN")} PB ${n === 1 ? "Coin" : "Coins"}`;

const coinAmount = (label: string) => (/^\d+$/.test(label.trim()) ? Number(label.trim()) : 0);

/** Biggest coin prize on the wheel ("Win up to …", and what counts as the jackpot). */
const topPrize = (segments: SpinSegment[]) => segments.reduce((max, s) => Math.max(max, coinAmount(s.label)), 0);

const prefersReducedMotion = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** One wording for "no spin left today", in the status line and the 409 toast. */
const SPIN_DONE = "Today's spin is done — come back tomorrow";
const REOPEN = "Please reopen PB Zone from the Potato Bazaar app";

function lastSpinLine(last: SpinLast | null | undefined) {
  if (last?.reward.type === "coins" && last.reward.amount > 0) return `Today you won ${coinsText(last.reward.amount)}`;
  return SPIN_DONE;
}

function CoinImage({ className = "" }: { className?: string }) {
  return <Image src="/images/home/coin-transparent.png" alt="" width={64} height={64} sizes="32px" className={`${className} object-contain`} />;
}

/** Two curved arrows: "spin". */
function SpinGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 12a8 8 0 0 1-13.7 5.6" />
      <path d="M4 12a8 8 0 0 1 13.7-5.6" />
      <path d="M17.7 2.8v3.8h-3.8" />
      <path d="M6.3 21.2v-3.8h3.8" />
    </svg>
  );
}

function Sparkle({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor" aria-hidden>
      <path d="M12 1.5c.7 5.4 2.7 8.1 9 10.5-6.3 2.4-8.3 5.1-9 10.5-.7-5.4-2.7-8.1-9-10.5 6.3-2.4 8.3-5.1 9-10.5Z" />
    </svg>
  );
}

/**
 * Spin & Win: one free spin per IST day, paid in PB Coins only. The server picks the prize; the wheel
 * only animates to what it returned, and nothing is shown as won before the server confirmed it.
 * States: loading → ready (button pulses) → spinning → result card (coins fly into the balance) → used up
 * (live countdown). Also: unavailable (404: "Opening soon", nothing to retry; 401/403: reopen from the app,
 * no button; otherwise "Try again"), lost (spin unanswered, retry with the same id), and, in production,
 * sessions without an identity are asked to open PB Zone from the app.
 */
export function SpinWinApp() {
  const { token, userId, userName } = useUserSession();
  const { coins, addCoins, setWallet } = usePbCoins();
  // Without a token or user id the request goes out as the shared dev identity (a name alone doesn't change
  // that), so production builds only let sessions with an identity spin.
  const lockedGuest = IS_PROD && !token && !userId;

  const [status, setStatus] = useState<SpinStatus | null>(null);
  /** missing = 404 (not deployed yet), auth = 401/403 (the app's session expired), unreachable = the rest. */
  const [statusError, setStatusError] = useState<"missing" | "auth" | "unreachable" | null>(null);
  /** Counts status answers (ok or not), so the reopen timer re-arms after each one. */
  const [statusAnswers, setStatusAnswers] = useState(0);
  const [flow, setFlow] = useState<Flow>({ kind: "idle" });
  const [now, setNow] = useState(() => Date.now());
  const [guestWaitOver, setGuestWaitOver] = useState(false);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [flying, setFlying] = useState<FlyingCoin[]>([]);
  const [coinPop, setCoinPop] = useState(0);
  const [motion] = useState(() => new WheelMotion(restAngle(REST_INDEX, DEFAULT_SPIN_SEGMENTS.length), DEFAULT_SPIN_SEGMENTS.length));

  const mountedRef = useRef(false);
  const authRef = useRef<QuizAuth>({ token, userId, userName });
  const statusReq = useRef(0);
  const attemptRef = useRef(0);
  const busyRef = useRef(false);
  const flowRef = useRef<Flow>(flow);
  const segmentsRef = useRef<SpinSegment[]>(DEFAULT_SPIN_SEGMENTS);
  /** A confirmed payout whose coins haven't reached the wallet yet (flushed if the player leaves mid-landing). */
  const unpaidRef = useRef<SpinResult | null>(null);
  const timers = useRef(new Set<number>());
  const coinSeq = useRef(0);
  const wheelBoxRef = useRef<HTMLDivElement>(null);
  const cardButtonRef = useRef<HTMLButtonElement>(null);

  const segments = status?.segments ?? DEFAULT_SPIN_SEGMENTS;

  // A refused session wins over a status we already have: nothing on this screen can fix it.
  const phase: Phase =
    flow.kind !== "idle"
      ? flow.kind
      : lockedGuest
        ? guestWaitOver
          ? "guest"
          : "loading"
        : statusError === "auth"
          ? "unavailable"
          : status
            ? status.canSpin
              ? "ready"
              : "used"
            : statusError
              ? "unavailable"
              : "loading";

  useEffect(() => {
    mountedRef.current = true;
    const pending = timers.current;
    return () => {
      mountedRef.current = false;
      pending.forEach((id) => window.clearTimeout(id));
      pending.clear();
    };
  }, []);

  // Leaving mid-landing: the server has already paid, so the local wallet mirror still gets the coins.
  useEffect(
    () => () => {
      const unpaid = unpaidRef.current;
      unpaidRef.current = null;
      if (unpaid?.wallet) setWallet({ coins: unpaid.wallet.points, earnedCoins: unpaid.wallet.earnedPoints });
      else if (unpaid?.reward.type === "coins") addCoins(unpaid.reward.amount);
    },
    [addCoins, setWallet],
  );

  useEffect(() => {
    authRef.current = { token, userId, userName };
  }, [token, userId, userName]);

  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  /** setTimeout that is cleared if the screen unmounts. */
  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
    return id;
  }, []);

  const cancelLater = useCallback((id: number) => {
    window.clearTimeout(id);
    timers.current.delete(id);
  }, []);

  const changeFlow = useCallback((next: Flow) => {
    flowRef.current = next;
    setFlow(next);
  }, []);

  const announce = useCallback((text: string) => {
    // A trailing no-break space makes a repeated message count as new, so it is read again.
    setAnnouncement((prev) => (prev === text ? `${text} ` : text));
  }, []);

  const loadStatus = useCallback(() => {
    const req = ++statusReq.current;
    const watchdog = later(() => {
      if (req === statusReq.current) setStatusError((e) => e ?? "unreachable");
    }, STATUS_TIMEOUT_MS);
    fetchSpinStatus(authRef.current).then(
      (next) => {
        cancelLater(watchdog);
        if (!mountedRef.current || req !== statusReq.current || flowRef.current.kind !== "idle") return;
        // A leftover request id only guards a spin committed today that might still be replayed (an extra
        // spin). With no spin left, or nothing spun today, it could only replay an old day's result as a
        // new win, so drop it; the server's allowance check still stops a double payout.
        if (!next.canSpin || !next.lastSpin) clearPendingSpinRequest();
        setStatus(next);
        setStatusError(null);
        setStatusAnswers((n) => n + 1);
        setNow(Date.now());
        if (next.wallet) setWallet({ coins: next.wallet.points, earnedCoins: next.wallet.earnedPoints });
      },
      (err: unknown) => {
        cancelLater(watchdog);
        if (!mountedRef.current || req !== statusReq.current) return;
        const code = err instanceof QuizApiError ? err.status : 0;
        setStatusError(code === 404 ? "missing" : code === 401 || code === 403 ? "auth" : "unreachable");
        setStatusAnswers((n) => n + 1);
      },
    );
  }, [cancelLater, later, setWallet]);

  // Status follows the identity: the session starts as the guest default and hydrates a moment later
  // (stale answers are dropped by the request counter). userName changes alone don't refetch.
  useEffect(() => {
    if (lockedGuest) return;
    loadStatus();
  }, [token, userId, lockedGuest, loadStatus]);

  useEffect(() => {
    if (!lockedGuest) return;
    const id = window.setTimeout(() => setGuestWaitOver(true), GUEST_GRACE_MS);
    return () => window.clearTimeout(id);
  }, [lockedGuest]);

  // Used up: tick the countdown every 30s, and ask again once the next IST day has opened. Re-armed after every
  // status answer: if the server still says "used" once that time has passed (its rollover lags our clock),
  // it asks again every 30s instead of waiting forever on "Next spin soon".
  const nextMs = phase === "used" && status?.nextSpinAt ? Date.parse(status.nextSpinAt) : NaN;
  useEffect(() => {
    if (!Number.isFinite(nextMs)) return;
    const tick = window.setInterval(() => setNow(Date.now()), 30_000);
    const wait = nextMs - Date.now() + 1000;
    const reopen = window.setTimeout(loadStatus, wait > 0 ? Math.min(Math.max(1000, wait), 2 ** 31 - 1) : 30_000);
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      setNow(Date.now());
      if (Date.now() >= nextMs) loadStatus();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(reopen);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [nextMs, statusAnswers, loadStatus]);

  // Rest pose: like the tile before any spin; on today's prize once the spin is used up.
  const lastSpinId = status?.lastSpin?.segmentId;
  const restIndex = phase === "used" && lastSpinId ? segments.findIndex((s) => s.id === lastSpinId) : -1;
  useLayoutEffect(() => {
    motion.setCount(segments.length);
    if (motion.busy) return;
    if (restIndex >= 0) {
      if (motion.moved && !prefersReducedMotion()) void motion.glideTo(restIndex);
      else motion.snapTo(restIndex);
    } else if (!motion.moved) {
      motion.snapTo(REST_INDEX % segments.length);
    }
  }, [motion, segments.length, restIndex]);

  useEffect(() => {
    motion.onTick((gap) => {
      sounds.play("ui");
      if (gap > 170) haptic(6);
    });
    return () => motion.onTick(null);
  }, [motion]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const showingResult = flow.kind === "result";
  useEffect(() => {
    if (showingResult) cardButtonRef.current?.focus();
  }, [showingResult]);

  function showToast(text: string) {
    setToast({ id: Date.now(), text });
    announce(text);
  }

  function syncWallet(result: SpinResult) {
    if (result.wallet) setWallet({ coins: result.wallet.points, earnedCoins: result.wallet.earnedPoints });
  }

  function payWallet(result: SpinResult) {
    if (result.wallet) syncWallet(result);
    else if (result.reward.type === "coins") addCoins(result.reward.amount);
  }

  /** Coins burst out of the winning wedge and stream into the balance pill. */
  function flyCoins(count: number) {
    const box = wheelBoxRef.current?.getBoundingClientRect();
    const pill = document.getElementById("spin-coin-pill");
    const target = (pill?.querySelector("[data-coin-target]") ?? pill)?.getBoundingClientRect();
    if (!box || !target) return;
    const x = box.left + (box.width * WHEEL_ART.burstX) / WHEEL_ART.width;
    const y = box.top + (box.height * WHEEL_ART.burstY) / WHEEL_ART.height;
    const dx = target.left + target.width / 2 - x;
    const dy = target.top + target.height / 2 - y;
    const batch = Array.from({ length: count }, (_, i) => ({
      id: ++coinSeq.current,
      x,
      y,
      sx: (Math.random() - 0.5) * 120,
      sy: -24 - Math.random() * 56,
      dx,
      dy,
      delay: i * 40,
    }));
    setFlying(batch);
    later(() => setFlying([]), 1000 + count * 40);
  }

  /** The wheel has settled on the server's result: show it, then pay it into the balance. */
  function reveal(result: SpinResult, index: number) {
    const list = segmentsRef.current;
    const slice = 360 / list.length;
    const won = result.reward.type === "coins" ? result.reward.amount : 0;
    const top = topPrize(list);
    const jackpot = won > 0 && top > 0 && won >= top;
    busyRef.current = false;
    setStatus((prev) => ({
      segments: prev?.segments ?? list,
      canSpin: result.canSpin,
      spinsLeft: result.spinsLeft,
      nextSpinAt: result.nextSpinAt,
      lastSpin: { spinId: result.spinId, segmentId: result.segmentId, reward: result.reward, at: new Date().toISOString() },
      wallet: result.wallet ?? prev?.wallet ?? null,
    }));
    setNow(Date.now());
    changeFlow({
      kind: "result",
      result,
      jackpot,
      spot: index >= 0 ? { start: mod360(index * slice + motion.angle), sweep: slice } : null,
    });

    if (result.reward.type === "extra_spin") {
      unpaidRef.current = null;
      syncWallet(result);
      sounds.play("party");
      haptic([10, 30, 20]);
      announce(result.canSpin ? "One more spin! Tap Spin again." : "One more spin!");
      return;
    }
    sounds.play(jackpot ? "win" : "coin");
    haptic(jackpot ? [18, 40, 26] : [10, 30, 20]);
    announce(jackpot ? `Jackpot! You won ${coinsText(won)}!` : won > 0 ? `You won ${coinsText(won)}!` : "Spin complete.");
    unpaidRef.current = null;
    if (won <= 0 || prefersReducedMotion()) {
      // Reduced motion: the balance just changes (no coin flight, no pop).
      payWallet(result);
      if (won > 0) sounds.play("create");
      return;
    }
    flyCoins(jackpot ? 12 : won >= 40 ? 9 : 7);
    // Not `later`: the wallet must still be paid if the player leaves during the coin flight.
    window.setTimeout(() => {
      payWallet(result);
      if (!mountedRef.current) return;
      setCoinPop((n) => n + 1);
      sounds.play("create");
    }, COIN_LAND_MS);
  }

  function onSpinAnswer(attempt: number, result: SpinResult, reduced: boolean) {
    if (attempt !== attemptRef.current) {
      // We gave up waiting for this one: the retry sends the same request id and the server replays it.
      syncWallet(result);
      return;
    }
    clearPendingSpinRequest();
    if (!mountedRef.current) {
      payWallet(result);
      return;
    }
    unpaidRef.current = result;
    const list = segmentsRef.current;
    const index = list.findIndex((s) => s.id === result.segmentId);
    // A wedge we don't have (the table changed under us): stop on an edge, the card still says what was paid.
    const settle = index < 0 ? motion.stop() : reduced ? motion.landQuick(index) : motion.land(index, landingJitter(list.length));
    void settle.then(() => {
      if (mountedRef.current && attempt === attemptRef.current) reveal(result, index);
    });
  }

  function onSpinFailed(attempt: number, error: unknown) {
    if (attempt !== attemptRef.current) return;
    const code = error instanceof QuizApiError ? error.status : 0;
    // A 4xx is a definite answer (the id was spent or refused); network errors and 5xx keep it for the retry.
    const definite = code >= 400 && code < 500;
    if (definite) clearPendingSpinRequest();
    if (!mountedRef.current) return;
    void motion.stop().then(() => {
      if (!mountedRef.current || attempt !== attemptRef.current) return;
      busyRef.current = false;
      if (code === 409) {
        setStatus((prev) => (prev ? { ...prev, canSpin: false, spinsLeft: 0, lastSpin: null } : prev));
        changeFlow({ kind: "idle" });
        setNow(Date.now());
        sounds.play("invalid");
        showToast(SPIN_DONE);
        loadStatus();
        return;
      }
      if (code === 404) {
        setStatus(null);
        setStatusError("missing");
        changeFlow({ kind: "idle" });
        announce("Spin & Win opens soon.");
        return;
      }
      if (code === 401 || code === 403) {
        // Retrying won't help until the app hands over a fresh session: show the reopen note, no button.
        setStatusError("auth");
        changeFlow({ kind: "idle" });
        sounds.play("invalid");
        announce(REOPEN);
        return;
      }
      if (definite) {
        changeFlow({ kind: "idle" });
        showToast("Couldn't spin right now — please try again");
        loadStatus();
        return;
      }
      changeFlow({ kind: "lost" });
      sounds.play("invalid");
      haptic(30);
      announce("Connection lost. Tap Try again to finish your spin.");
    });
  }

  function onSpinTimeout(attempt: number) {
    if (attempt !== attemptRef.current || !mountedRef.current) return;
    // A late answer to this attempt now only syncs the wallet; the retry replays it with the same id.
    attemptRef.current += 1;
    void motion.stop().then(() => {
      if (!mountedRef.current) return;
      busyRef.current = false;
      changeFlow({ kind: "lost" });
      haptic(30);
      announce("Connection lost. Tap Try again to finish your spin.");
    });
  }

  const canStartSpin = phase === "ready" || phase === "lost" || (phase === "result" && Boolean(status?.canSpin));

  function handleSpin() {
    if (busyRef.current || !canStartSpin) return;
    busyRef.current = true;
    // Synchronously, before anything async: iOS only unlocks audio inside the tap itself.
    sounds.unlock();
    sounds.play("swap");
    haptic(12);
    statusReq.current += 1; // a status answer still in flight must not land on top of the spin
    setToast(null);
    changeFlow({ kind: "spinning" });
    announce("Spinning…");
    const reduced = prefersReducedMotion();
    if (!reduced) motion.start();
    const attempt = ++attemptRef.current;
    const requestId = pendingSpinRequestId();
    const watchdog = later(() => onSpinTimeout(attempt), SPIN_TIMEOUT_MS);
    spin(authRef.current, requestId).then(
      (result) => {
        cancelLater(watchdog);
        onSpinAnswer(attempt, result, reduced);
      },
      (error: unknown) => {
        cancelLater(watchdog);
        onSpinFailed(attempt, error);
      },
    );
  }

  function retryStatus() {
    sounds.unlock();
    sounds.play("ui");
    setStatusError(null);
    loadStatus();
  }

  function closeResult() {
    sounds.unlock();
    sounds.play("ui");
    setNow(Date.now());
    changeFlow({ kind: "idle" });
  }

  const top = topPrize(segments);
  const spinsLeft = status?.spinsLeft ?? 0;
  const countdown = Number.isFinite(nextMs)
    ? nextMs - now > 0
      ? `Next spin in ${formatCountdown(nextMs - now)}`
      : "Next spin soon"
    : "Come back tomorrow";

  /** 404: the API isn't deployed yet, so there's nothing to retry. */
  const openingSoon = phase === "unavailable" && statusError === "missing";
  /** A note instead of the button: guests in production, and a session the server refused (only the app can fix those). */
  const note =
    phase === "guest" ? "Open PB Zone from the Potato Bazaar app to spin" : phase === "unavailable" && statusError === "auth" ? REOPEN : null;
  /** "Win up to …" only while there's a spin to win. */
  const showTopPrize = phase === "ready" || phase === "spinning" || phase === "result";

  const buttonLabel =
    phase === "loading"
      ? "Loading…"
      : phase === "spinning"
        ? "Spinning…"
        : openingSoon
          ? "Opening soon"
          : phase === "lost" || phase === "unavailable"
            ? "Try again"
            : phase === "used"
              ? countdown
              : "Spin";
  const buttonDisabled = phase === "loading" || phase === "spinning" || phase === "used" || openingSoon;

  const readyLine =
    spinsLeft > 1 ? (
      `${spinsLeft} spins left today`
    ) : top > 0 ? (
      <>
        <span className="[@media(min-height:700px)]:hidden">Win up to {coinsText(top)}</span>
        <span className="hidden [@media(min-height:700px)]:inline">Your free spin for today is ready</span>
      </>
    ) : (
      "Your free spin for today is ready"
    );

  const line =
    phase === "ready"
      ? readyLine
      : phase === "spinning"
        ? "Good luck!"
        : phase === "used"
          ? lastSpinLine(status?.lastSpin)
          : phase === "lost"
            ? "Connection lost — tap to try again"
            : phase === "unavailable"
              ? openingSoon
                ? "Spin & Win opens soon"
                : "Couldn't reach Spin & Win — try again"
              : phase === "loading"
                ? "Getting the wheel ready…"
                : "";
  const lineIsProblem = phase === "lost" || (phase === "unavailable" && statusError === "unreachable");

  const lights: WheelLights = phase === "spinning" ? "chase" : phase === "result" ? "win" : phase === "ready" ? "idle" : "off";
  const wheelLabel = `Prize wheel: ${segments.map((s) => (coinAmount(s.label) > 0 ? coinsText(coinAmount(s.label)) : s.label)).join(", ")}`;

  return (
    <div className="spin-screen relative w-full overflow-x-clip" data-phase={phase}>
      <Decor />

      {flying.map((c) => (
        <span
          key={c.id}
          className="home-coin-fly"
          style={
            {
              left: c.x - 13,
              top: c.y - 13,
              animationDelay: `${c.delay}ms`,
              "--sx": c.sx,
              "--sy": c.sy,
              "--dx": c.dx,
              "--dy": c.dy,
            } as CSSProperties
          }
          aria-hidden
        >
          <CoinImage className="h-full w-full" />
        </span>
      ))}

      {toast ? (
        <div
          key={toast.id}
          className="spin-toast pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4"
          style={{ top: "calc(var(--header-top) + 3.75rem)" }}
        >
          <span className="rounded-full bg-[#0B3B22] px-4 py-2 text-center text-[13px] font-bold text-white shadow-lg">{toast.text}</span>
        </div>
      ) : null}

      {flow.kind === "result" && flow.jackpot ? <WinBurst colors={CONFETTI} /> : null}

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[520px] flex-col">
        <header className="relative z-20 grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4" style={{ paddingTop: "var(--header-top)" }}>
          <BackToHub href="/home" tone="light" className="justify-self-start" />
          <div className="min-w-0 text-center">
            <h1 className="font-display text-[clamp(22px,6.4vw,27px)] font-bold leading-[1.05] tracking-[-0.01em] text-[#0B3B22]">Spin &amp; Win</h1>
            <p className="mt-0.5 text-[clamp(11.5px,3.3vw,13px)] font-bold leading-tight text-[#2C4D38]">One free spin every day</p>
          </div>
          <div
            id="spin-coin-pill"
            className="spin-pill flex h-11 shrink-0 items-center gap-1.5 justify-self-end rounded-full pl-1.5 pr-3"
          >
            <span data-coin-target className="relative block h-7 w-7 shrink-0">
              <CoinImage className="h-7 w-7" />
            </span>
            <span
              key={coinPop}
              className={`font-display text-[16px] font-bold leading-none tabular-nums text-[#0B3B22] ${coinPop ? "quiz-pop" : ""}`}
            >
              {coins.toLocaleString("en-IN")}
            </span>
            <span className="sr-only">PB Coins</span>
          </div>
        </header>

        {/* Tall phones share the spare height evenly around the wheel and the button; short ones scroll. */}
        <main
          className="relative flex flex-1 flex-col items-center justify-evenly px-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.25rem)" }}
        >
          <div className="relative flex w-full flex-col items-center gap-[clamp(10px,2.4dvh,22px)] pb-[clamp(10px,2.6dvh,26px)] pt-[clamp(6px,1.6dvh,16px)]">
            {top > 0 ? (
              // Tall phones only; short ones say it under the button instead, keeping the wheel big. Hidden but
              // still holding its space when there's no spin to win, so the wheel doesn't jump between states.
              <p
                className={`spin-pill relative z-10 hidden items-center gap-1.5 rounded-full py-1 pl-1 pr-3.5 font-display text-[15.5px] font-semibold text-[#0B3B22] [@media(min-height:700px)]:flex ${
                  showTopPrize ? "" : "invisible"
                }`}
              >
                <CoinImage className="h-7 w-7" />
                Win up to {coinsText(top)}
              </p>
            ) : null}
            <div className="relative">
              <div aria-hidden className="spin-glow pointer-events-none absolute -inset-[16%] rounded-full" />
              <div aria-hidden className="spin-rays pointer-events-none absolute -inset-[24%] rounded-full" />
              <div ref={wheelBoxRef} className="spin-wheel-size relative">
                <SpinWheel
                  segments={segments}
                  motion={motion}
                  lights={lights}
                  spotlight={flow.kind === "result" ? flow.spot : null}
                  label={wheelLabel}
                />
                {/* The tile's potato, cheering beside the stand; it hops onto the result card instead. */}
                <Image
                  src="/games/match/mascot-cheer.webp"
                  alt=""
                  width={255}
                  height={288}
                  sizes="110px"
                  className={`spin-stage-mascot pointer-events-none absolute bottom-[0.5%] left-[-5%] h-auto w-[26%] transition-opacity duration-300 motion-reduce:transition-none ${
                    showingResult ? "opacity-0" : ""
                  }`}
                />
              </div>
            </div>
          </div>

          <div className={`w-full max-w-[340px] shrink-0 ${showingResult ? "invisible" : ""}`}>
            {note ? (
              <p id="spin-line" className="spin-note rounded-2xl px-4 py-3.5 text-center text-[14px] font-bold leading-snug text-balance text-[#0B3B22]">
                {note}
              </p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={phase === "unavailable" ? retryStatus : handleSpin}
                  disabled={buttonDisabled}
                  aria-describedby="spin-line"
                  className={`spin-cta flex h-[60px] w-full items-center justify-center gap-2.5 rounded-full px-5 font-display font-bold ${
                    phase === "used" ? "text-[clamp(17px,5vw,20px)]" : "text-[22px] tracking-[0.01em]"
                  } ${phase === "ready" ? "spin-cta-ready" : ""}`}
                >
                  {phase === "ready" ? <SpinGlyph className="h-6 w-6" /> : null}
                  <span className="truncate">{buttonLabel}</span>
                </button>
                {/* The halo keeps the line readable where it crosses the corner leaves on short phones. */}
                <p
                  id="spin-line"
                  className={`mt-3 min-h-5 text-center text-[13.5px] font-bold leading-snug [text-shadow:0_0_2px_#FFF1B0,0_0_6px_#FFF1B0,0_0_12px_#FFE27A] ${lineIsProblem ? "text-[#8A2E0F]" : "text-[#2C4D38]"}`}
                >
                  {line}
                </p>
              </>
            )}
          </div>

          {flow.kind === "result" ? (
            <div
              className="absolute inset-x-4 z-30 flex justify-center"
              style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1.25rem)" }}
            >
              <ResultCard
                result={flow.result}
                jackpot={flow.jackpot}
                canSpin={Boolean(status?.canSpin)}
                onDone={closeResult}
                onSpinAgain={handleSpin}
                buttonRef={cardButtonRef}
              />
            </div>
          ) : null}
        </main>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}

function ResultCard({
  result,
  jackpot,
  canSpin,
  onDone,
  onSpinAgain,
  buttonRef,
}: {
  result: SpinResult;
  jackpot: boolean;
  canSpin: boolean;
  onDone: () => void;
  onSpinAgain: () => void;
  buttonRef: Ref<HTMLButtonElement>;
}) {
  const extra = result.reward.type === "extra_spin";
  const amount = result.reward.amount;
  return (
    <section aria-labelledby="spin-result-title" className="spin-card spin-card-in relative w-full max-w-[340px] rounded-[26px] px-5 pb-5 pt-4 text-center">
      <Image
        src="/games/match/mascot-cheer.webp"
        alt=""
        width={255}
        height={288}
        sizes="90px"
        className="spin-card-mascot pointer-events-none absolute -top-[66px] left-1 h-[88px] w-auto"
      />
      <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#9A5208]">
        {jackpot ? "Jackpot!" : extra ? "Lucky you!" : "You won"}
      </p>
      {extra ? (
        <h2 id="spin-result-title" className="mt-1.5 font-display text-[32px] font-bold leading-none text-[#0B3B22]">
          One more spin!
        </h2>
      ) : (
        <h2 id="spin-result-title" className="mt-1.5 flex flex-col items-center font-display text-[#0B3B22]">
          <span className="flex items-center gap-2 text-[44px] font-bold leading-none tabular-nums">
            <CoinImage className="h-10 w-10" />+{amount.toLocaleString("en-IN")}
          </span>
          <span className="mt-1 text-[18px] font-semibold leading-tight">PB Coins</span>
        </h2>
      )}
      <p className="mt-2 text-[13.5px] font-semibold leading-snug text-[#2C4D38]">
        {extra
          ? canSpin
            ? "The wheel gave you another go."
            : "The wheel gave you another go — come back tomorrow."
          : jackpot
            ? "The top prize! Added to your PB Coins."
            : "Nice spin! Added to your PB Coins."}
      </p>
      {canSpin ? (
        <button
          ref={buttonRef}
          type="button"
          onClick={onSpinAgain}
          className="spin-cta mt-4 flex h-[54px] w-full items-center justify-center gap-2 rounded-full font-display text-[20px] font-bold"
        >
          <SpinGlyph className="h-5 w-5" />
          Spin again
        </button>
      ) : (
        <button
          ref={buttonRef}
          type="button"
          onClick={onDone}
          className="spin-cta spin-cta--green mt-4 flex h-[54px] w-full items-center justify-center rounded-full font-display text-[20px] font-bold"
        >
          Done
        </button>
      )}
    </section>
  );
}

/** Hub-style scenery: leaves in the bottom corners and a few sparkles. Decorative only. */
function Decor() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <Image
        src="/games/hub-v2/leaves-bl.webp"
        alt=""
        width={246}
        height={129}
        sizes="(max-width: 520px) 46vw, 240px"
        className="absolute bottom-0 left-0 h-auto w-[min(44vw,230px)]"
      />
      <Image
        src="/games/hub-v2/leaves-br.webp"
        alt=""
        width={232}
        height={128}
        sizes="(max-width: 520px) 44vw, 220px"
        className="absolute bottom-0 right-0 h-auto w-[min(42vw,216px)]"
      />
      <Sparkle className="spin-sparkle absolute left-[9%] top-[21%] h-5 w-5 text-white" />
      <Sparkle className="spin-sparkle absolute left-[17%] top-[15%] h-3 w-3 text-white" style={{ animationDelay: "0.9s" }} />
      <Sparkle className="spin-sparkle absolute right-[10%] top-[24%] h-4 w-4 text-[#FFF6C8]" style={{ animationDelay: "1.6s" }} />
      <Sparkle className="spin-sparkle absolute right-[6%] top-[52%] h-3 w-3 text-white" style={{ animationDelay: "0.4s" }} />
    </div>
  );
}
