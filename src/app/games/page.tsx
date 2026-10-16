import { redirect } from "next/navigation";
import { withSearchParams } from "@/lib/routes";

/** The game list lives on the hub now. */
export default async function GamesPage({ searchParams }: PageProps<"/games">) {
  redirect(withSearchParams("/home", await searchParams));
}
