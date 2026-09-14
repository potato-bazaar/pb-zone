"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { usePbCoins } from "@/components/providers/PbCoinsProvider";
import { usePbPoints } from "@/components/providers/PbPointsProvider";
import { useUserSession } from "@/components/providers/UserSessionProvider";
import { scorePotatoNinja } from "@/lib/pb/scoring";
import { sounds } from "@/components/crush/render/sound";
import { CHALLENGES, MODES, POWERUPS, SKINS, coinsFor, type Boosts, type Challenge, type NinjaMode, type PowerKind, type RunStats } from "./engine/ninja";
import { getNinjaServerSnapshot, getNinjaSnapshot, subscribeNinja, updateNinja } from "./engine/progress";
import { NinjaPlay } from "./ui/NinjaPlay";
import { CoinPill, NinjaButton, NinjaHeader, NinjaIcon, SkinFace } from "./ui/ninjaUi";

type Screen = "splash" | "menu" | "modes" | "skins" | "shop" | "leaderboard" | "settings" | "challenges" | "play";

const LEADERS = [
  { name: "PotatoKing", score: 1245, cell: 7 },
  { name: "SpudMaster", score: 980, cell: 2 },
  { name: "AlooNinja", score: 870, cell: 1 },
  { name: "MashPro", score: 760, cell: 4 },
  { name: "TaterTot", score: 690, cell: 3 },
  { name: "SpudBuddy", score: 200, cell: 0 },
];

export function PotatoNinjaApp() {
  const router = useRouter();
  const { coins, addCoins, spendCoins } = usePbCoins();
  const { awardPoints } = usePbPoints();
  const { userName } = useUserSession();
  const progress = useSyncExternalStore(subscribeNinja, getNinjaSnapshot, getNinjaServerSnapshot);

  const [screen, setScreen] = useState<Screen>("splash");
  const [pendingMode, setPendingMode] = useState<NinjaMode | null>(null);
  const [pendingChallenge, setPendingChallenge] = useState<Challenge | null>(null);
  const [boosts, setBoosts] = useState<Boosts>({});
  const [run, setRun] = useState<{ mode: NinjaMode; boosts: Boosts; challenge: Challenge | null; key: number } | null>(null);
  const [shopTab, setShopTab] = useState<"power" | "skins">("power");
  const [boardTab, setBoardTab] = useState<"global" | "friends">("global");
  const [toast, setToast] = useState<string | null>(null);

  const say = (t: string) => {
    setToast(t);
    window.setTimeout(() => setToast(null), 1600);
  };

  if (!progress) {
    return <div className="nj-splash-bg relative mx-auto flex h-dvh w-full max-w-screen-sm items-center justify-center" />;
  }

  const go = (s: Screen) => {
    sounds.unlock();
    sounds.play("ui");
    setScreen(s);
  };

  const chooseMode = (mode: NinjaMode, challenge: Challenge | null = null) => {
    sounds.play("ui");
    setPendingMode(mode);
    setPendingChallenge(challenge);
    setBoosts({});
  };

  const startRun = () => {
    if (!pendingMode) return;
    const used: Boosts = { ...boosts };
    updateNinja((p) => {
      const inv = { ...p.powerups };
      for (const k of Object.keys(used) as PowerKind[]) if (used[k] && inv[k] > 0) inv[k] -= 1;
      return { ...p, powerups: inv };
    });
    setRun({ mode: pendingMode, boosts: used, challenge: pendingChallenge, key: Date.now() });
    setPendingMode(null);
    setScreen("play");
  };

  const finishRun = (stats: RunStats, completedChallenge: boolean) => {
    if (!run) return { coins: 0, newBest: false, pb: null };
    const earned = coinsFor(stats.score) + (completedChallenge && run.challenge ? run.challenge.reward : 0);
    if (earned > 0) addCoins(earned);
    const newBest = stats.score > (progress.best[run.mode] ?? 0);
    const firstChallengeClear = completedChallenge && !!run.challenge && !progress.challengesDone.includes(run.challenge.id);

    // PB Points: independent of Coins, one credit per run.
    const score = scorePotatoNinja({ sliced: stats.sliced, golden: stats.golden, maxCombo: stats.maxCombo, bombsHit: stats.bombsHit, challengeDone: firstChallengeClear, newBest });
    const pb = awardPoints({
      eventId: `ninja:${run.key}`,
      gameId: "potato-ninja",
      points: score.points,
      lines: score.lines,
      perfect: score.perfect,
      label: `Potato Ninja · ${MODES.find((m) => m.id === run.mode)?.name ?? run.mode}`,
    });
    updateNinja((p) => ({
      ...p,
      best: { ...p.best, [run.mode]: Math.max(p.best[run.mode] ?? 0, stats.score) },
      runs: p.runs + 1,
      totalSliced: p.totalSliced + stats.sliced,
      challengesDone: completedChallenge && run.challenge && !p.challengesDone.includes(run.challenge.id) ? [...p.challengesDone, run.challenge.id] : p.challengesDone,
    }));
    return { coins: earned, newBest, pb };
  };

  const buySkin = (id: string) => {
    const skin = SKINS.find((s) => s.id === id);
    if (!skin) return;
    if (progress.ownedSkins.includes(id)) {
      updateNinja((p) => ({ ...p, skin: id }));
      sounds.play("ui");
      return;
    }
    if (!spendCoins(skin.price)) {
      say(`Need ${skin.price} Coins for ${skin.name}`);
      return;
    }
    sounds.play("coin");
    updateNinja((p) => ({ ...p, ownedSkins: [...p.ownedSkins, id], skin: id }));
    say(`${skin.name} unlocked!`);
  };

  const buyPower = (id: PowerKind) => {
    const item = POWERUPS.find((p) => p.id === id)!;
    if (!spendCoins(item.price)) {
      say(`Need ${item.price} Coins for ${item.name}`);
      return;
    }
    sounds.play("coin");
    updateNinja((p) => ({ ...p, powerups: { ...p.powerups, [id]: (p.powerups[id] ?? 0) + 1 } }));
    say(`+1 ${item.name}`);
  };

  const selectedSkin = SKINS.find((s) => s.id === progress.skin) ?? SKINS[0];
  const bestOverall = Math.max(progress.best.classic, progress.best.time, progress.best.arcade);

  /* ------------------------------ screens ---------------------------- */

  if (screen === "play" && run) {
    return (
      <NinjaPlay
        key={run.key}
        mode={run.mode}
        boosts={run.boosts}
        skinId={progress.skin}
        best={progress.best[run.mode] ?? 0}
        challenge={run.challenge}
        coins={coins}
        onFinish={finishRun}
        onRestart={() => {
          setRun({ ...run, boosts: {}, key: Date.now() });
        }}
        onMenu={() => {
          setRun(null);
          setScreen("menu");
        }}
      />
    );
  }

  if (screen === "splash") {
    return (
      <div className="nj-splash-bg relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col items-center overflow-hidden">
        <button type="button" onClick={() => router.push("/games")} aria-label="Back to games" className="nj-wood absolute left-4 z-20 flex h-11 w-11 items-center justify-center rounded-2xl text-white" style={{ top: "var(--header-top)" }}>
          <NinjaIcon name="back" className="h-5 w-5" />
        </button>
        <div className="relative z-10 mt-[18vh] flex flex-col items-center">
          <Logo big />
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/games/ninja-hero.png" alt="" className="nj-hero pointer-events-none absolute left-1/2 top-[38%] h-[36vh] w-auto -translate-x-1/2 object-contain" draggable={false} />
        <div className="relative z-10 mt-auto flex w-full flex-col items-center px-8" style={{ paddingBottom: "calc(2.5rem + env(safe-area-inset-bottom, 0px))" }}>
          <p className="nj-tagline mb-4 text-center font-display text-[15px] font-extrabold uppercase tracking-[0.12em] text-white">
            Slice your way
            <br />
            to a better harvest!
          </p>
          <NinjaButton variant="gold" onClick={() => go("menu")} className="max-w-xs">
            Play
          </NinjaButton>
        </div>
      </div>
    );
  }

  const shell = (title: string, body: React.ReactNode, right?: React.ReactNode) => (
    <div className="nj-barn relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col overflow-hidden">
      <div className="nj-barn-dim absolute inset-0" aria-hidden />
      <NinjaHeader title={title} onBack={() => go("menu")} right={right} />
      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 pb-8 [-webkit-overflow-scrolling:touch]">{body}</div>
      {toast ? <div className="crush-toast pointer-events-none absolute inset-x-0 top-[30%] z-40 flex justify-center"><span className="rounded-full bg-black/80 px-4 py-2 text-[13px] font-bold text-white">{toast}</span></div> : null}
    </div>
  );

  if (screen === "menu") {
    return (
      <div className="nj-barn relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col overflow-hidden">
        <div className="nj-barn-dim absolute inset-0" aria-hidden />
        <header className="relative z-10 flex items-center justify-between gap-2 px-4" style={{ paddingTop: "var(--header-top)" }}>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => router.push("/games")} aria-label="Back to games" className="nj-wood flex h-11 w-11 items-center justify-center rounded-2xl text-white">
              <NinjaIcon name="back" className="h-5 w-5" />
            </button>
            <div className="nj-coinpill flex items-center gap-2 rounded-full py-1 pl-1 pr-3">
              <SkinFace cell={selectedSkin.cell} size={34} className="rounded-full bg-black/30" />
              <div className="leading-tight">
                <p className="font-display text-[13px] font-extrabold text-white">Hi, {userName}!</p>
                <p className="text-[10px] font-bold text-[#E8CFA6]">Best {bestOverall}</p>
              </div>
            </div>
          </div>
          <CoinPill coins={coins} onPlus={() => go("shop")} />
        </header>

        <div className="relative z-10 mt-4 flex flex-col items-center">
          <Logo />
        </div>

        <div className="relative z-10 mx-auto mt-6 flex w-full max-w-xs flex-col gap-3 px-4">
          <NinjaButton variant="green" icon="play" onClick={() => chooseMode("classic")}>
            Classic Mode
          </NinjaButton>
          <NinjaButton icon="timer" onClick={() => chooseMode("time")}>
            Time Attack
          </NinjaButton>
          <NinjaButton icon="star" onClick={() => chooseMode("arcade")}>
            Arcade Mode
          </NinjaButton>
          <NinjaButton icon="trophy" onClick={() => go("challenges")}>
            Challenges
          </NinjaButton>
        </div>

        <div className="relative z-10 mt-auto grid grid-cols-4 gap-2 px-6" style={{ paddingBottom: "calc(1.75rem + env(safe-area-inset-bottom, 0px))" }}>
          {[
            ["skins", "Skins", "🥷"],
            ["shop", "Shop", "🏪"],
            ["leaderboard", "Leaderboard", "🏆"],
            ["settings", "Settings", "⚙️"],
          ].map(([id, label, emoji]) => (
            <button key={id} type="button" onClick={() => go(id as Screen)} className="flex flex-col items-center gap-1 active:scale-95">
              <span className="nj-wood flex h-14 w-14 items-center justify-center rounded-2xl text-[26px]">
                {id === "skins" ? <SkinFace cell={selectedSkin.cell} size={40} /> : emoji}
              </span>
              <span className="font-display text-[11px] font-extrabold text-[#F3E3C6]">{label}</span>
            </button>
          ))}
        </div>

        {pendingMode ? (
          <StartSheet
            mode={pendingMode}
            challenge={pendingChallenge}
            boosts={boosts}
            inventory={progress.powerups}
            onToggle={(k) => setBoosts((b) => ({ ...b, [k]: !b[k] }))}
            onStart={startRun}
            onClose={() => setPendingMode(null)}
          />
        ) : null}
        {toast ? <div className="crush-toast pointer-events-none absolute inset-x-0 top-[30%] z-40 flex justify-center"><span className="rounded-full bg-black/80 px-4 py-2 text-[13px] font-bold text-white">{toast}</span></div> : null}
      </div>
    );
  }

  if (screen === "modes") {
    return shell(
      "Select Mode",
      <div className="flex flex-col gap-3">
        {MODES.map((m) => (
          <button key={m.id} type="button" onClick={() => chooseMode(m.id)} className="nj-panel flex items-center gap-3 rounded-2xl p-3 text-left active:scale-[0.98]">
            <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-black/30 text-[30px]">{m.emoji}</span>
            <span className="flex-1">
              <span className="block font-display text-[18px] font-extrabold text-white">{m.name}</span>
              <span className="block text-[12px] text-[#E8CFA6]">{m.blurb}</span>
            </span>
            <NinjaIcon name="back" className="h-5 w-5 rotate-180 text-[#E8CFA6]" />
          </button>
        ))}
      </div>,
    );
  }

  if (screen === "challenges") {
    return shell(
      "Challenges",
      <div className="flex flex-col gap-3">
        {CHALLENGES.map((c) => {
          const done = progress.challengesDone.includes(c.id);
          return (
            <button key={c.id} type="button" disabled={done} onClick={() => chooseMode(c.mode, c)} className={`nj-panel flex items-center gap-3 rounded-2xl p-3 text-left active:scale-[0.98] ${done ? "opacity-70" : ""}`}>
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-black/30 text-[24px]">{done ? "✅" : "🏆"}</span>
              <span className="flex-1">
                <span className="block font-display text-[16px] font-extrabold text-white">{c.title}</span>
                <span className="block text-[12px] text-[#E8CFA6]">{c.body}</span>
              </span>
              <span className="rounded-full bg-[#FFC107] px-2.5 py-1 font-display text-[12px] font-extrabold text-[#4a2d00]">{done ? "Done" : `+${c.reward} Coins`}</span>
            </button>
          );
        })}
        {pendingMode ? (
          <StartSheet mode={pendingMode} challenge={pendingChallenge} boosts={boosts} inventory={progress.powerups} onToggle={(k) => setBoosts((b) => ({ ...b, [k]: !b[k] }))} onStart={startRun} onClose={() => setPendingMode(null)} />
        ) : null}
      </div>,
    );
  }

  if (screen === "skins") {
    return shell(
      "Potato Skins",
      <div className="grid grid-cols-3 gap-3">
        {SKINS.map((s) => {
          const owned = progress.ownedSkins.includes(s.id);
          const selected = progress.skin === s.id;
          return (
            <button key={s.id} type="button" onClick={() => buySkin(s.id)} className={`nj-panel relative flex flex-col items-center rounded-2xl p-2 pb-2.5 active:scale-95 ${selected ? "nj-panel-selected" : ""}`}>
              <SkinFace cell={s.cell} size={82} />
              <span className="mt-1 font-display text-[13px] font-extrabold text-white">{s.name}</span>
              {selected ? (
                <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#3FB05C] text-white ring-2 ring-white/80">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
                </span>
              ) : !owned ? (
                <span className="mt-1 rounded-full bg-[#FFC107] px-2 py-0.5 text-[11px] font-extrabold text-[#4a2d00]">{s.price} Coins</span>
              ) : (
                <span className="mt-1 text-[11px] font-bold text-[#E8CFA6]">Owned</span>
              )}
            </button>
          );
        })}
      </div>,
      <CoinPill coins={coins} onPlus={() => go("shop")} />,
    );
  }

  if (screen === "shop") {
    return shell(
      "Shop",
      <div>
        <div className="nj-tabs mb-3 grid grid-cols-2 rounded-full p-1">
          {(["power", "skins"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setShopTab(t)} className={`rounded-full py-2 font-display text-[14px] font-extrabold ${shopTab === t ? "bg-[#6A5AE0] text-white" : "text-[#E8CFA6]"}`}>
              {t === "power" ? "Power-Ups" : "Skins"}
            </button>
          ))}
        </div>
        {shopTab === "power" ? (
          <div className="nj-panel-light flex flex-col divide-y divide-[#e8dcc6] rounded-2xl">
            {POWERUPS.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl text-[24px]" style={{ backgroundColor: p.color }}>{p.emoji}</span>
                <span className="flex-1">
                  <span className="block font-display text-[15px] font-extrabold text-[#3a2410]">{p.name}</span>
                  <span className="block text-[11px] text-[#7a5a3a]">{p.blurb} · owned {progress.powerups[p.id] ?? 0}</span>
                </span>
                <button type="button" onClick={() => buyPower(p.id)} className="nj-btn nj-btn-gold rounded-full px-3 py-1.5 font-display text-[13px] font-extrabold text-[#4a2d00]">
                  🪙 {p.price}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {SKINS.filter((s) => !progress.ownedSkins.includes(s.id)).map((s) => (
              <button key={s.id} type="button" onClick={() => buySkin(s.id)} className="nj-panel flex flex-col items-center rounded-2xl p-2 active:scale-95">
                <SkinFace cell={s.cell} size={82} />
                <span className="mt-1 font-display text-[13px] font-extrabold text-white">{s.name}</span>
                <span className="mt-1 rounded-full bg-[#FFC107] px-2 py-0.5 text-[11px] font-extrabold text-[#4a2d00]">{s.price} Coins</span>
              </button>
            ))}
            {SKINS.every((s) => progress.ownedSkins.includes(s.id)) ? <p className="col-span-3 text-center text-[13px] text-[#E8CFA6]">You own every skin. Legend!</p> : null}
          </div>
        )}
        <div className="nj-sign mt-6 px-6 py-4 text-center">
          <p className="font-display text-[18px] font-extrabold text-[#5a3a14]">More power.<br />Bigger harvests!</p>
        </div>
      </div>,
      <CoinPill coins={coins} />,
    );
  }

  if (screen === "leaderboard") {
    const rows = [...(boardTab === "global" ? LEADERS : LEADERS.slice(1, 4)), { name: "You", score: bestOverall, cell: selectedSkin.cell }]
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
    return shell(
      "🏆 Leaderboard",
      <div>
        <div className="nj-tabs mb-3 grid grid-cols-2 rounded-full p-1">
          {(["global", "friends"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setBoardTab(t)} className={`rounded-full py-2 font-display text-[14px] font-extrabold capitalize ${boardTab === t ? "bg-[#6A5AE0] text-white" : "text-[#E8CFA6]"}`}>
              {t}
            </button>
          ))}
        </div>
        <ol className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <li key={r.name} className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${r.name === "You" ? "bg-[#6A5AE0] text-white" : i === 0 ? "nj-row-gold" : "nj-panel-light text-[#3a2410]"}`}>
              <span className={`flex h-7 w-7 items-center justify-center rounded-full font-display text-[13px] font-extrabold ${i < 3 ? "bg-[#FFC107] text-[#4a2d00]" : "bg-black/15"}`}>{i + 1}</span>
              <SkinFace cell={r.cell} size={34} className="rounded-full bg-black/20" />
              <span className="flex-1 font-display text-[15px] font-extrabold">{r.name}</span>
              <span className="font-display text-[15px] font-extrabold tabular-nums">{r.score.toLocaleString("en-IN")}</span>
            </li>
          ))}
        </ol>
      </div>,
    );
  }

  // settings
  return shell(
    "Settings",
    <div className="flex flex-col gap-3">
      <button type="button" onClick={() => updateNinja((p) => ({ ...p, sound: !p.sound }))} className="nj-panel flex items-center justify-between rounded-2xl p-4 text-left">
        <span className="font-display text-[16px] font-extrabold text-white">Sound effects</span>
        <span className={`h-7 w-12 rounded-full p-1 transition ${progress.sound ? "bg-[#3FB05C]" : "bg-black/40"}`}>
          <span className={`block h-5 w-5 rounded-full bg-white transition ${progress.sound ? "translate-x-5" : ""}`} />
        </span>
      </button>
      <div className="nj-panel rounded-2xl p-4 text-[#E8CFA6]">
        <p className="font-display text-[16px] font-extrabold text-white">Your stats</p>
        <p className="mt-1 text-[13px]">Runs played: <b className="text-white">{progress.runs}</b></p>
        <p className="text-[13px]">Potatoes sliced: <b className="text-white">{progress.totalSliced}</b></p>
        <p className="text-[13px]">Best · Classic {progress.best.classic} · Time {progress.best.time} · Arcade {progress.best.arcade}</p>
      </div>
      <NinjaButton onClick={() => { updateNinja(() => ({ ...getNinjaSnapshot(), best: { classic: 0, time: 0, arcade: 0 }, challengesDone: [], runs: 0, totalSliced: 0 })); say("Progress reset"); }}>
        Reset progress
      </NinjaButton>
    </div>,
  );
}

function Logo({ big = false }: { big?: boolean }) {
  return (
    <div className={`nj-logo relative ${big ? "scale-110" : ""}`}>
      <span className="nj-leaf nj-leaf-l" aria-hidden />
      <span className="nj-leaf nj-leaf-r" aria-hidden />
      <div className="nj-sign relative px-7 pb-2 pt-3 text-center">
        <span className="nj-sign-nail left-2 top-2" />
        <span className="nj-sign-nail right-2 top-2" />
        <span className="nj-logo-potato block font-display text-[40px] font-extrabold leading-none">POTATO</span>
        <span className="nj-logo-ninja -mt-1 block font-display text-[34px] font-extrabold leading-none">NINJA</span>
      </div>
    </div>
  );
}

function StartSheet({
  mode,
  challenge,
  boosts,
  inventory,
  onToggle,
  onStart,
  onClose,
}: {
  mode: NinjaMode;
  challenge: Challenge | null;
  boosts: Boosts;
  inventory: Record<PowerKind, number>;
  onToggle: (k: PowerKind) => void;
  onStart: () => void;
  onClose: () => void;
}) {
  const m = MODES.find((x) => x.id === mode)!;
  return (
    <div className="absolute inset-0 z-40 flex items-end">
      <button type="button" aria-label="Close" onClick={onClose} className="crush-fade-in absolute inset-0 bg-black/60" />
      <div className="crush-sheet-in nj-panel relative w-full rounded-t-[1.75rem] px-5 pt-4" style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}>
        <p className="font-display text-[12px] font-bold uppercase tracking-[0.18em] text-[#E8CFA6]">{challenge ? "Challenge" : "Ready?"}</p>
        <h2 className="font-display text-[24px] font-extrabold text-white">{challenge ? challenge.title : m.name}</h2>
        <p className="text-[13px] text-[#E8CFA6]">{challenge ? challenge.body : m.blurb}</p>
        <p className="mt-3 font-display text-[12px] font-bold uppercase tracking-[0.18em] text-[#E8CFA6]">Use power-ups</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {POWERUPS.map((p) => {
            const have = inventory[p.id] ?? 0;
            const on = !!boosts[p.id];
            return (
              <button key={p.id} type="button" disabled={have <= 0} onClick={() => onToggle(p.id)} className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-left ring-2 transition disabled:opacity-40 ${on ? "bg-[#3FB05C]/30 ring-[#7CE05A]" : "bg-black/30 ring-transparent"}`}>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg text-[18px]" style={{ backgroundColor: p.color }}>{p.emoji}</span>
                <span className="min-w-0">
                  <span className="block truncate font-display text-[13px] font-extrabold text-white">{p.name}</span>
                  <span className="block text-[10px] text-[#E8CFA6]">{have} owned</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-4">
          <NinjaButton variant="green" icon="play" onClick={onStart}>
            Start
          </NinjaButton>
        </div>
      </div>
    </div>
  );
}
