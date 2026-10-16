import { redirect } from "next/navigation";
import { withSearchParams } from "@/lib/routes";

export default async function LeaderboardPage({ searchParams }: PageProps<"/leaderboard">) {
  redirect(withSearchParams("/pb", await searchParams));
}
