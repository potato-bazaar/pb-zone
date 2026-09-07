import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur-sm safe-top">
      <div className="mx-auto box-border flex h-14 w-full max-w-screen-sm items-center justify-between px-4 sm:px-6">
        <Link href="/" className="touch-target flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            PZ
          </span>
          <span className="text-base font-semibold tracking-tight sm:text-lg">
            PP Zone
          </span>
        </Link>

        <button
          type="button"
          className="touch-target flex shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-slate-100"
          aria-label="Notifications"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden
          >
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
        </button>
      </div>
    </header>
  );
}
