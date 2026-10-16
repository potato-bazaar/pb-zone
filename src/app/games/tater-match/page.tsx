import { TaterMatchApp } from "@/components/match/TaterMatchApp";

/** Its own route (static segments win over `[id]`), so Match & Learn's first load doesn't ship the other games. */
export default function TaterMatchPage() {
  return <TaterMatchApp />;
}
