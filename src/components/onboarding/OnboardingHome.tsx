"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

const PURPLE = "#EDE7FC";

export function OnboardingHome() {
  const router = useRouter();

  return (
    <div
      className="relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col overflow-hidden"
      style={{ backgroundColor: PURPLE }}
    >
      <section
        className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden"
        style={{ backgroundColor: PURPLE }}
      >
        <header
          className="relative z-20 flex w-full shrink-0 items-center justify-between gap-3 px-4 pb-1 sm:px-5"
          style={{
            paddingTop: "var(--header-top)",
            backgroundColor: PURPLE,
          }}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <Image
              src="/images/pb-zone-logo.png"
              alt=""
              width={44}
              height={52}
              className="h-10 w-auto shrink-0 object-contain"
              priority
              unoptimized
            />
            <span className="font-display text-[1.35rem] font-semibold leading-none tracking-tight text-[#1a1a2e]">
              PB Zone !!
            </span>
          </div>

          <button
            type="button"
            onClick={() => router.push("/home")}
            className="touch-target shrink-0 px-1 text-[15px] font-semibold text-[#6A5AE0]"
          >
            Skip
          </button>
        </header>

        <div
          className="relative min-h-0 w-full flex-1 overflow-hidden"
          style={{ backgroundColor: PURPLE }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/pb-zone-hero-v4.png"
            alt="Welcome to PB Zone — Potato Bazaar Game Zone"
            className="absolute top-0 left-1/2 h-full w-[112%] max-w-none -translate-x-1/2 object-cover object-top"
            draggable={false}
          />
        </div>

        <div className="grass-wave z-20" aria-hidden>
          <svg
            viewBox="0 0 375 40"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0 22 C60 6, 100 34, 160 16 C220 0, 270 30, 375 12 L375 40 L0 40 Z"
              fill="#84C64D"
            />
            <path
              d="M0 28 C70 14, 120 36, 180 22 C240 10, 300 32, 375 18 L375 40 L0 40 Z"
              fill="#FFFFFF"
            />
          </svg>
        </div>
      </section>

      <section
        className="relative z-30 -mt-0.5 flex w-full shrink-0 flex-col bg-white px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]"
      >
        <h1 className="text-center font-display text-[1.75rem] font-bold leading-tight text-[#1a1a2e]">
          Play. Learn. Earn.
        </h1>
        <p className="mx-auto mt-2 max-w-[300px] text-center text-sm leading-relaxed text-[#6B7280]">
          Explore fun games, test your skills and become a Potato Champion!
        </p>

        <div className="mt-5 flex w-full items-center gap-3">
          <button
            type="button"
            aria-label="Back"
            className="touch-target flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[3px] border-[#1a1a2e] bg-white text-[#1a1a2e]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>

          <Link
            href="/home"
            className="touch-target relative flex h-14 min-w-0 flex-1 items-center justify-center rounded-full bg-primary px-6 text-base font-extrabold text-primary-foreground shadow-md shadow-primary/25 active:scale-[0.98]"
          >
            <span className="-translate-x-3">Let&apos;s Play</span>
            <span
              className="absolute right-6 text-lg font-black tracking-[0.15em]"
              aria-hidden
            >
              {">>>"}
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
