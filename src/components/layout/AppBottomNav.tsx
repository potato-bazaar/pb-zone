"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type IconProps = { active?: boolean };

function HomeIcon({ active }: IconProps) {
  if (active) {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="#fff" aria-hidden>
        <path d="M12 2.8 2.6 10.4a.9.9 0 0 0-.1 1.25l.55.6a.9.9 0 0 0 1.25.05L6 10.9V19.5c0 .8.65 1.45 1.45 1.45H9.8v-5.4h4.4v5.4h2.35c.8 0 1.45-.65 1.45-1.45V10.9l1.7 1.4a.9.9 0 0 0 1.25-.05l.55-.6a.9.9 0 0 0-.1-1.25L12 2.8Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="#3D3A5C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m3 10.5 9-7.2 9 7.2" />
      <path d="M5.5 9.8V19a1.2 1.2 0 0 0 1.2 1.2H10v-5.2h4v5.2h3.3A1.2 1.2 0 0 0 18.5 19V9.8" />
    </svg>
  );
}

function GamesIcon({ active }: IconProps) {
  const c = active ? "#fff" : "#3D3A5C";
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke={c}
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* Modern gamepad body with curved grips */}
      <path d="M8.2 8.2h7.6c1.7 0 2.9 1.1 3.2 2.6l.85 4.1c.35 1.7-.7 3.2-2.4 3.55-.55.12-1.15-.05-1.55-.45l-1.35-1.35c-.35-.35-.85-.55-1.35-.55h-2.6c-.5 0-1 .2-1.35.55L7.7 18c-.4.4-1 .57-1.55.45-1.7-.35-2.75-1.85-2.4-3.55l.85-4.1C5.3 9.3 6.5 8.2 8.2 8.2Z" />
      {/* D-pad diamond (left) */}
      <path d="M8.9 11.15 7.55 12.5l1.35 1.35 1.35-1.35-1.35-1.35Z" />
      {/* Action buttons — 4 dots diamond (right) */}
      <circle cx="15.35" cy="11.35" r="0.85" fill={c} stroke="none" />
      <circle cx="14.15" cy="12.55" r="0.85" fill={c} stroke="none" />
      <circle cx="16.55" cy="12.55" r="0.85" fill={c} stroke="none" />
      <circle cx="15.35" cy="13.75" r="0.85" fill={c} stroke="none" />
    </svg>
  );
}

function RewardsIcon({ active }: IconProps) {
  const c = active ? "#fff" : "#3D3A5C";
  if (active) {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="#fff" aria-hidden>
        <path d="M8.2 3.5c-1.5 0-2.7 1.3-2.7 2.9 0 .5.1.9.3 1.3H4.8A1.8 1.8 0 0 0 3 9.5v2.2c0 .6.4 1 1 1h.5V19a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-6.3h.5c.6 0 1-.4 1-1V9.5a1.8 1.8 0 0 0-1.8-1.8h-1c.2-.4.3-.8.3-1.3 0-1.6-1.2-2.9-2.7-2.9-1.1 0-2 .6-2.5 1.5-.5-.9-1.4-1.5-2.5-1.5Zm0 2c.5 0 .9.4.9 1v1.2H7.3c0-.6.4-1.2.9-1.2Zm7.6 0c.5 0 .9.5.9 1.2h-1.8V6.5c0-.6.4-1 .9-1ZM5 11.7h6.2V19H6a.5.5 0 0 1-.5-.5v-6.8H5Zm7.8 0H19v6.8a.5.5 0 0 1-.5.5h-5.2v-7.3Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3.5" y="9.5" width="17" height="3.5" rx="1" />
      <path d="M5.5 13V19a1.5 1.5 0 0 0 1.5 1.5h10A1.5 1.5 0 0 0 18.5 19v-6" />
      <path d="M12 9.5V20.5" />
      <path d="M12 9.5S10.2 4.5 7.5 4.5 5 6.5 5 8c0 0 2-1.2 7-1.2Z" />
      <path d="M12 9.5S13.8 4.5 16.5 4.5 19 6.5 19 8c0 0-2-1.2-7-1.2Z" />
    </svg>
  );
}

function OrderIcon({ active }: IconProps) {
  const c = active ? "#fff" : "#3D3A5C";
  if (active) {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="#fff" aria-hidden>
        <path d="M8 3.5h8a2 2 0 0 1 2 2V6h1.2A1.8 1.8 0 0 1 21 7.8v11.4A1.8 1.8 0 0 1 19.2 21H4.8A1.8 1.8 0 0 1 3 19.2V7.8A1.8 1.8 0 0 1 4.8 6H6v-.5a2 2 0 0 1 2-2Zm0 2.5v.5h8V6H8Zm-2.2 3v9.7c0 .1.1.3.2.3h11.8c.1 0 .2-.1.2-.3V9.5H5.8Zm3.2 2.2h6v1.6h-6v-1.6Zm0 3.2h4.5v1.6H9v-1.6Z" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke={c}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4.5V3.8A1.3 1.3 0 0 1 10.3 2.5h3.4A1.3 1.3 0 0 1 15 3.8v.7" />
      <path d="M9 11h6M9 15h4" />
    </svg>
  );
}

function ProfileIcon({ active }: IconProps) {
  const c = active ? "#fff" : "#3D3A5C";
  if (active) {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="#fff" aria-hidden>
        <path d="M12 3.2a4.3 4.3 0 1 1 0 8.6 4.3 4.3 0 0 1 0-8.6Zm0 10.2c3.7 0 6.9 1.9 8.2 4.7.35.75-.2 1.6-1.05 1.6H4.85c-.85 0-1.4-.85-1.05-1.6 1.3-2.8 4.5-4.7 8.2-4.7Z" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke={c}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.2 19.5c1.5-3.2 3.9-4.8 6.8-4.8s5.3 1.6 6.8 4.8" />
    </svg>
  );
}

const tabs = [
  { href: "/home", label: "Home", Icon: HomeIcon },
  { href: "/games", label: "Games", Icon: GamesIcon },
  { href: "/rewards", label: "Rewards", Icon: RewardsIcon },
  { href: "/orders", label: "Your Order", Icon: OrderIcon },
  { href: "/profile", label: "Profile", Icon: ProfileIcon },
] as const;

export function AppBottomNav() {
  const pathname = usePathname();
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  // Dismiss any focused field when changing tabs (clears iOS ▲▼✓ accessory bar)
  useEffect(() => {
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [pathname]);

  // Hide nav while iOS/Android keyboard + form accessory are up
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const covered = window.innerHeight - vv.height - vv.offsetTop;
      setKeyboardOpen(covered > 80);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  if (keyboardOpen) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 rounded-t-[1.75rem] bg-[#F5F3FF] shadow-[0_-4px_20px_rgba(106,90,224,0.06)]"
      aria-label="Main"
      style={{
        paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div className="mx-auto flex h-[4.25rem] w-full max-w-screen-sm items-center justify-around px-1.5 pt-1">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.Icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex min-w-0 flex-1 flex-col items-center justify-center"
            >
              <span
                className={
                  active
                    ? "flex flex-col items-center justify-center gap-1 rounded-[1.15rem] bg-[#6A5AE0] px-2.5 py-2"
                    : "flex flex-col items-center justify-center gap-1 px-2.5 py-2"
                }
              >
                <Icon active={active} />
                <span
                  className={`max-w-full truncate text-[9px] font-semibold leading-none ${
                    active ? "text-white" : "text-[#3D3A5C]"
                  }`}
                >
                  {tab.label}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
