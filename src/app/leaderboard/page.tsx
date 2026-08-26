import Link from "next/link";
import { AppBottomNav } from "@/components/layout/AppBottomNav";

const ranks = [
  { place: 1, name: "Spud King", points: 2450 },
  { place: 2, name: "Tater Ace", points: 2100 },
  { place: 3, name: "Mash Pro", points: 1890 },
  { place: 4, name: "Potato Player", points: 120, you: true },
  { place: 5, name: "Fry Master", points: 980 },
];

export default function LeaderboardPage() {
  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-screen-sm bg-[#F5F3FF]">
      <div
        className="px-4 pb-[calc(7.25rem+env(safe-area-inset-bottom,0px))]"
        style={{ paddingTop: "var(--header-top)" }}
      >
        <div className="mb-5 flex items-center gap-3">
          <Link
            href="/home"
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#1a1a2e] bg-white"
            aria-label="Back to home"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <h1 className="font-display text-2xl font-bold text-[#1a1a2e]">
            Leaderboard
          </h1>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
          {ranks.map((row, i) => (
            <div
              key={row.place}
              className={`flex items-center gap-3 px-4 py-3.5 ${
                i < ranks.length - 1 ? "border-b border-[#F0EEF8]" : ""
              } ${row.you ? "bg-[#F5F3FF]" : ""}`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  row.place === 1
                    ? "bg-[#F5C518] text-[#1a1a2e]"
                    : row.place === 2
                      ? "bg-[#E5E7EB] text-[#1a1a2e]"
                      : row.place === 3
                        ? "bg-[#FDBA74] text-[#1a1a2e]"
                        : "bg-[#F5F3FF] text-primary"
                }`}
              >
                {row.place}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[#1a1a2e]">
                  {row.name}
                  {row.you ? (
                    <span className="ml-2 text-[11px] font-semibold text-primary">
                      You
                    </span>
                  ) : null}
                </p>
              </div>
              <span className="text-sm font-bold text-[#6A5AE0]">
                {row.points.toLocaleString()} pts
              </span>
            </div>
          ))}
        </div>
      </div>
      <AppBottomNav />
    </div>
  );
}
