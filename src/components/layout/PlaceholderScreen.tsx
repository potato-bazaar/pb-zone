import { AppBottomNav } from "@/components/layout/AppBottomNav";

type PlaceholderProps = {
  title: string;
};

export default function PlaceholderScreen({ title }: PlaceholderProps) {
  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-screen-sm bg-[#F5F3FF]">
      <div
        className="px-4 pb-[calc(7.25rem+env(safe-area-inset-bottom,0px))]"
        style={{ paddingTop: "var(--header-top)" }}
      >
        <h1 className="font-display text-2xl font-bold text-[#1a1a2e]">{title}</h1>
        <p className="mt-2 text-sm text-muted">Coming soon.</p>
      </div>
      <AppBottomNav />
    </div>
  );
}
