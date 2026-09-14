import { notFound } from "next/navigation";
import Link from "next/link";
import { AppBottomNav } from "@/components/layout/AppBottomNav";
import { QuizTimeApp } from "@/components/quiz/QuizTimeApp";
import { PotatoCrushApp } from "@/components/crush/PotatoCrushApp";
import { PotatoNinjaApp } from "@/components/ninja/PotatoNinjaApp";
import { PotatoSortApp } from "@/components/sort/PotatoSortApp";
import { PotatoRunApp } from "@/components/run/PotatoRunApp";
import { TaterMatchApp } from "@/components/tater-match/TaterMatchApp";
import { ALL_GAMES } from "@/data/games";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function GameDetailPage({ params }: Props) {
  const { id } = await params;
  const game = ALL_GAMES.find((g) => g.id === id);
  if (!game) notFound();

  if (id === "quiz-time") {
    return <QuizTimeApp />;
  }

  if (id === "potato-crush") {
    return <PotatoCrushApp />;
  }

  if (id === "potato-ninja") {
    return <PotatoNinjaApp />;
  }

  if (id === "potato-sort") {
    return <PotatoSortApp />;
  }

  if (id === "potato-run") {
    return <PotatoRunApp />;
  }

  if (id === "tater-match") {
    return <TaterMatchApp />;
  }

  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-screen-sm bg-[#F5F3FF]">
      <div
        className="px-4 pb-[calc(7.25rem+env(safe-area-inset-bottom,0px))]"
        style={{ paddingTop: "var(--header-top)" }}
      >
        <Link
          href="/games"
          className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-primary"
        >
          ← All Games
        </Link>
        <h1 className="font-display text-2xl font-bold text-[#1a1a2e]">
          {game.title}
        </h1>
        <p className="mt-2 text-sm text-muted">{game.description}</p>
        <p className="mt-6 rounded-2xl bg-white p-4 text-sm text-[#6B7280] shadow-sm">
          Game play coming soon.
        </p>
      </div>
      <AppBottomNav />
    </div>
  );
}
