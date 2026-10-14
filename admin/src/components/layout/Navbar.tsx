import React, { useState } from 'react';
import { Bell, ChevronDown, Menu, Search, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenMobileNav: () => void;
  /** Page content has scrolled under the header, so it needs a backdrop. */
  scrolled?: boolean;
  pendingClaims?: number;
}

function Dismiss({ onClose }: { onClose: () => void }) {
  return <button type="button" tabIndex={-1} aria-hidden className="fixed inset-0 z-40 cursor-default" onClick={onClose} />;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  onOpenMobileNav,
  scrolled = false,
  pendingClaims = 0,
}) => {
  const navigate = useNavigate();
  const [menu, setMenu] = useState<'notifications' | 'profile' | null>(null);
  const toggle = (next: 'notifications' | 'profile') => setMenu((open) => (open === next ? null : next));
  const go = (path: string) => {
    setMenu(null);
    navigate(path);
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 px-4 transition-[background-color,box-shadow] duration-200 sm:gap-3 sm:px-5 xl:h-[76px] xl:px-6 2xl:h-20 2xl:px-[26px]',
        scrolled ? 'bg-[#F4FBF6]/90 shadow-[0_1px_0_rgba(15,23,42,0.06)] backdrop-blur-md' : 'bg-transparent',
      )}
    >
      <button
        type="button"
        onClick={onOpenMobileNav}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#334155] shadow-card lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="relative min-w-0 max-w-[576px] flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#475569] xl:left-4 xl:h-5 xl:w-5" />
        <input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search players, games, rewards..."
          className="h-10 w-full rounded-xl border border-[#E6ECE8] bg-white pl-10 pr-3 text-sm text-[#0F172A] shadow-card placeholder:text-[#64748B] focus:border-[#86D19A] focus:outline-none focus:ring-4 focus:ring-[#16A34A]/10 xl:h-[46px] xl:pl-12 xl:text-[15px]"
        />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4 2xl:gap-7">
        <div className="relative">
          <button
            type="button"
            onClick={() => toggle('notifications')}
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#334155] shadow-card hover:text-[#0F172A] xl:h-12 xl:w-12"
            aria-label={pendingClaims > 0 ? `Notifications (${pendingClaims} pending claims)` : 'Notifications'}
          >
            <Bell className="h-5 w-5 xl:h-[22px] xl:w-[22px]" strokeWidth={1.75} />
            {pendingClaims > 0 && (
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#FE1E3C] ring-2 ring-white xl:right-2.5 xl:top-2.5" />
            )}
          </button>
          {menu === 'notifications' && (
            <>
              <Dismiss onClose={() => setMenu(null)} />
              <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl bg-white p-4 text-sm shadow-lg ring-1 ring-black/5">
                <div className="font-semibold text-[#0F172A]">Notifications</div>
                {pendingClaims > 0 ? (
                  <button
                    type="button"
                    onClick={() => go('/orders')}
                    className="mt-2 w-full rounded-lg bg-[#FFF7ED] px-3 py-2 text-left text-[#9A3412] hover:bg-[#FFEDD5]"
                  >
                    {pendingClaims} prize {pendingClaims === 1 ? 'claim needs' : 'claims need'} attention
                  </button>
                ) : (
                  <p className="mt-2 text-[#64748B]">No notifications</p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => toggle('profile')}
            className="flex items-center gap-3 rounded-full py-1 pr-1 text-left sm:pr-2"
            aria-label="Account menu"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E0F7E7] text-sm font-semibold text-[#15803D] xl:h-[46px] xl:w-[46px] xl:text-base">
              AD
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-[15px] font-bold text-[#0F172A] 2xl:text-base">Admin</span>
              <span className="block text-[13px] text-[#64748B] 2xl:text-sm">PB Zone</span>
            </span>
            <ChevronDown className="hidden h-5 w-5 text-[#334155] sm:block 2xl:ml-5" />
          </button>
          {menu === 'profile' && (
            <>
              <Dismiss onClose={() => setMenu(null)} />
              <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl bg-white p-1.5 shadow-lg ring-1 ring-black/5">
                <button
                  type="button"
                  onClick={() => go('/settings')}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#334155] hover:bg-[#F0FAF2]"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
