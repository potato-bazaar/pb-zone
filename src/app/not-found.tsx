import type { Metadata, Viewport } from "next";
import { BackToHub } from "@/components/layout/BackToHub";
import { HubButton } from "@/components/layout/HubButton";

export const metadata: Metadata = {
  title: "Page not found · PB Zone",
};

/** Yellow status bar, like the hub this page belongs to. */
export const viewport: Viewport = {
  themeColor: "#FFD84A",
};

/** The hub's corner leaves, sized as the same share of the viewport width as in the 1024px reference. */
const LEAVES = [
  { src: "/games/hub-v2/leaves-tl.webp", width: 141, height: 232, className: "left-0 top-0 w-[13.8vw] max-w-[110px]" },
  { src: "/games/hub-v2/leaves-tr.webp", width: 138, height: 232, className: "right-0 top-0 w-[13.5vw] max-w-[108px]" },
  { src: "/games/hub-v2/leaves-bl.webp", width: 246, height: 129, className: "bottom-0 left-0 w-[24vw] max-w-[190px]" },
  { src: "/games/hub-v2/leaves-br.webp", width: 232, height: 128, className: "bottom-0 right-0 w-[22.7vw] max-w-[180px]" },
] as const;

/**
 * Every `notFound()` and unknown URL lands here. Inside the PB app's webview a bare 404 is a dead end,
 * so this one wears the hub's look and offers two ways back to it.
 * As the root not-found boundary its client imports load with every route, so the art is plain `<img>`
 * (no next/image runtime) and the only client pieces are the two small back buttons. The images are
 * fetchPriority="low" because React otherwise preloads every eager <img> in this tree on every page.
 */
export default function NotFound() {
  return (
    <main className="relative isolate flex min-h-dvh w-full flex-col items-center overflow-hidden bg-[#FFD84A] bg-[radial-gradient(ellipse_at_50%_42%,#FFD84A_0%,#FFD84A_45%,#FDD235_100%)] font-sans">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        {LEAVES.map((leaf) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={leaf.src}
            src={leaf.src}
            alt=""
            width={leaf.width}
            height={leaf.height}
            fetchPriority="low"
            draggable={false}
            className={`absolute h-auto select-none ${leaf.className}`}
          />
        ))}
      </div>

      <BackToHub href="/home" tone="light" className="absolute left-[max(1rem,env(safe-area-inset-left))] top-[var(--header-top)] z-20" />

      {/* Clears the back button on top; the deeper bottom pad lifts the group to the optical centre on tall screens. */}
      <div className="flex w-full max-w-[520px] flex-1 flex-col items-center justify-center px-6 pt-[calc(var(--header-top)+3.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] text-center [@media(max-height:520px)]:pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/games/match/mascot-oops.webp"
          alt=""
          width={145}
          height={192}
          fetchPriority="low"
          draggable={false}
          className="h-[clamp(96px,20dvh,170px)] w-auto select-none drop-shadow-[0_10px_12px_rgba(140,95,0,0.22)] [@media(max-height:520px)]:h-[72px]"
        />
        <h1 className="mt-4 font-display text-[clamp(28px,8.2vw,36px)] font-bold leading-tight text-[#0B3B22] [@media(max-height:520px)]:mt-2">
          Page not found
        </h1>
        <p className="mt-2 max-w-[20rem] text-[clamp(15px,4.2vw,17px)] font-semibold leading-snug text-[#2C4D38]">
          Oops! We couldn&apos;t find that page.{" "}
          <span className="block">Your coins and rewards are safe.</span>
        </p>
        {/* Pops to the hub when it's behind us, else replaces this entry: the phone's back never returns to this dead end. */}
        <HubButton className="mt-7 [@media(max-height:520px)]:mt-4" />
      </div>
    </main>
  );
}
