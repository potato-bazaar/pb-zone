import { notFound } from "next/navigation";
import { BackToHub } from "@/components/layout/BackToHub";
import { PotatoCrushApp } from "@/components/crush/PotatoCrushApp";
import { PotatoNinjaApp } from "@/components/ninja/PotatoNinjaApp";
// import { PotatoSortApp } from "@/components/sort/PotatoSortApp";
import { PotatoRunApp } from "@/components/run/PotatoRunApp";
import { ALL_GAMES } from "@/data/games";

type Props = {
  params: Promise<{ id: string }>;
};

/** Hidden games and the fallback. The live games (quiz-time, tater-match, spin-win) have their own routes. */
export default async function GameDetailPage({ params }: Props) {
  const { id } = await params;
  const game = ALL_GAMES.find((g) => g.id === id);
  if (!game) notFound();

  if (id === "potato-crush") {
    return <PotatoCrushApp />;
  }

  if (id === "potato-ninja") {
    return <PotatoNinjaApp />;
  }

  if (id === "potato-run") {
    return <PotatoRunApp />;
  }

  // Coming later:
  // if (id === "potato-sort") {
  //   return <PotatoSortApp />;
  // }

  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-screen-sm bg-[#F5F3FF]">
      <div
        className="px-4"
        style={{ paddingTop: "var(--header-top)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.5rem)" }}
      >
        <BackToHub href="/home" tone="lavender" className="mb-4" />
        <h1 className="font-display text-2xl font-bold text-[#1a1a2e]">
          {game.title}
        </h1>
        <p className="mt-2 text-sm text-muted">{game.description}</p>
        <p className="mt-6 rounded-2xl bg-white p-4 text-sm text-[#6B7280] shadow-sm">
          Game play coming soon.
        </p>
      </div>
    </div>
  );
}
