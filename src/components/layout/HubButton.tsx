"use client";

import { useBackTo } from "@/hooks/useBackTo";

/**
 * Big green "Back to PB Zone" pill for dead ends (the 404 page). `useBackTo` rather than a `<Link replace>`:
 * when the hub is already behind us it pops back to it instead of stacking a second hub entry.
 * `className` is for placement only.
 */
export function HubButton({ className = "" }: { className?: string }) {
  const goBack = useBackTo("/home");

  return (
    <button
      type="button"
      onClick={goBack}
      className={`flex min-h-14 w-full max-w-[20rem] cursor-pointer items-center justify-center gap-2.5 rounded-full bg-gradient-to-b from-[#17663A] to-[#0B3B22] px-6 py-3 font-display text-[18px] font-bold text-white shadow-[0_5px_0_#062514,0_12px_22px_rgba(11,59,34,0.28)] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#0B3B22] active:translate-y-[3px] active:shadow-[0_2px_0_#062514,0_6px_12px_rgba(11,59,34,0.24)] motion-safe:transition-[translate,box-shadow] motion-safe:duration-100 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M3.5 10.5 12 3.8l8.5 6.7" />
        <path d="M5.8 9v9.4c0 .9.7 1.6 1.6 1.6h9.2c.9 0 1.6-.7 1.6-1.6V9" />
        <path d="M10 20v-5.2h4V20" />
      </svg>
      Back to PB Zone
    </button>
  );
}
