import { redirect } from "next/navigation";
import { withSearchParams } from "@/lib/routes";

export default async function StorePage({ searchParams }: PageProps<"/store">) {
  redirect(withSearchParams("/orders", await searchParams));
}
