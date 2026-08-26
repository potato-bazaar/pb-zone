import { BottomNav } from "./BottomNav";
import { Header } from "./Header";

type MobileShellProps = {
  children: React.ReactNode;
};

export function MobileShell({ children }: MobileShellProps) {
  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-x-hidden bg-background">
      <Header />
      <main className="flex-1 w-full pb-[calc(4.5rem+var(--safe-bottom))]">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
