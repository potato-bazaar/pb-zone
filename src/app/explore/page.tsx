import { redirect } from "next/navigation";
import { withSearchParams } from "@/lib/routes";

/** A tab of the retired bottom nav; everything lives on the hub now. */
export default async function ExplorePage({ searchParams }: PageProps<"/explore">) {
  redirect(withSearchParams("/home", await searchParams));
}
