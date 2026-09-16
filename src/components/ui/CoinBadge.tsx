type CoinBadgeProps = {
  /** Real balance shown to the user */
  amount: number;
  className?: string;
};

export function CoinBadge({ amount, className = "" }: CoinBadgeProps) {
  const display = Number.isFinite(amount)
    ? Math.max(0, Math.floor(amount)).toLocaleString("en-IN")
    : "0";

  return (
    <div
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#E8E4F5] bg-white py-1.5 pl-1.5 pr-3 shadow-[0_2px_8px_rgba(43,31,122,0.08)] ${className}`}
      role="status"
      aria-label={`${display} coins`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/home/coin.png"
        alt=""
        className="h-5 w-5 shrink-0 object-contain"
        draggable={false}
      />
      <span className="min-w-[1.5rem] text-sm font-bold tabular-nums text-[#1a1a2e]">
        {display}
      </span>
    </div>
  );
}
