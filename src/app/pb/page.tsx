import { PbLeaderboardScreen } from "@/components/pb/PbLeaderboardScreen";

/** `/pb?game=quiz-time` opens that game's own leaderboard. */
export default async function PbLeaderboardPage({ searchParams }: PageProps<"/pb">) {
  const { game } = await searchParams;
  return <PbLeaderboardScreen initialGame={typeof game === "string" ? game : undefined} />;
}
