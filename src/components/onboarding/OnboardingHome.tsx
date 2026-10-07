"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const SKY = "#E4E7FF";
const WELCOME_SEEN_KEY = "pb-zone:welcome-seen";

function hasSeenWelcome() {
  try {
    return localStorage.getItem(WELCOME_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markWelcomeSeen() {
  try {
    localStorage.setItem(WELCOME_SEEN_KEY, "1");
  } catch {
    /* storage can be blocked in some webviews */
  }
}

function Sparkles() {
  return (
    <svg
      width="34"
      height="26"
      viewBox="0 0 34 26"
      aria-hidden
      className="shrink-0"
    >
      <path
        d="M10 1.2 11.7 7.1 17.6 8.6 11.7 10.1 10 16 8.3 10.1 2.4 8.6 8.3 7.1Z"
        fill="#F6C445"
      />
      <path
        d="M23.2 9.2 24.4 12.8 28.2 13.9 24.4 15 23.2 18.6 22 15 18.2 13.9 22 12.8Z"
        fill="#FFE07A"
      />
    </svg>
  );
}

export function OnboardingHome() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (hasSeenWelcome()) {
      router.replace("/home");
      return;
    }
    setVisible(true);
  }, [router]);

  function enterGame() {
    markWelcomeSeen();
    router.replace("/home");
  }

  if (!visible) {
    return <div className="min-h-dvh w-full" style={{ backgroundColor: SKY }} />;
  }

  return (
    <div className="flex min-h-dvh w-full justify-center" style={{ backgroundColor: SKY }}>
      <div
        className="relative flex h-dvh w-full max-w-screen-sm flex-col overflow-y-auto"
        style={{ backgroundColor: SKY }}
      >
        <div className="relative min-h-[8rem] w-full flex-1">
          <Image
            src="/images/pb-zone-welcome.jpg"
            alt="Welcome to PB Zone — Potato Bazaar Game Zone"
            fill
            priority
            sizes="(max-width: 640px) 100vw, 640px"
            className="object-cover object-[center_18%] min-[361px]:object-top"
          />
          <header
            className="relative z-20 flex w-full items-center justify-between gap-3 px-4 pb-1 sm:px-5"
            style={{ paddingTop: "max(0.9rem, env(safe-area-inset-top, 0px))" }}
          >
            <div className="flex min-w-0 items-center gap-2">
              <Image
                src="/images/pb-zone-logo.png"
                alt=""
                width={44}
                height={52}
                className="h-10 w-auto shrink-0 object-contain"
                sizes="44px"
                priority
              />
              <span className="font-display text-[1.35rem] font-semibold leading-none tracking-tight text-[#1B1433]">
                PB Zone !!
              </span>
            </div>
          </header>
        </div>

        <section className="relative z-30 -mt-6 flex w-full shrink-0 flex-col rounded-t-[34px] bg-white px-5 pt-4 shadow-[0_-10px_28px_rgba(55,90,140,0.12)] pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
          <div className="flex items-center justify-center gap-1">
            <Sparkles />
            <h1 className="font-display text-[1.7rem] font-bold leading-none tracking-tight text-[#1B1433]">
              Play. Learn. Earn.
            </h1>
          </div>
          <p className="mx-auto mt-2.5 max-w-[22rem] text-center text-base leading-snug text-[#8B90A0] md:max-w-[280px] md:text-[15px]">
            Explore fun games, test your skills and become a Potato Champion!
          </p>

          <div className="mt-4 flex w-full items-center gap-3">
            <button
              type="button"
              aria-label="Back"
              onClick={() => {
                if (window.history.length > 1) router.back();
              }}
              className="touch-target flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[2.5px] border-[#241A42] bg-white text-[#241A42]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>

            <button
              type="button"
              onClick={enterGame}
              className="touch-target relative flex h-14 min-w-0 flex-1 items-center justify-center rounded-full bg-[linear-gradient(180deg,#8B5CFF_0%,#6A35F0_100%)] px-6 font-display text-[1.15rem] font-bold text-white shadow-[0_8px_18px_rgba(106,53,240,0.35)] active:scale-[0.98]"
            >
              <span className="-translate-x-3">Let&apos;s Play</span>
              <span
                className="absolute right-6 text-lg font-black tracking-[0.18em]"
                aria-hidden
              >
                {">>>"}
              </span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
