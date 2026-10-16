import { redirect } from "next/navigation";
import { withSearchParams } from "@/lib/routes";

export default async function FullLeaderboardPage({ searchParams }: PageProps<"/leaderboard/full">) {
  redirect(withSearchParams("/pb", await searchParams));
}
