import { SpinWinApp } from "@/components/spin/SpinWinApp";

/** Its own route (static segments win over `[id]`), so Spin & Win's first load doesn't ship the other games. */
export default function SpinWinPage() {
  return <SpinWinApp />;
}
