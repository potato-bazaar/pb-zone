import React, { useState } from 'react';
import { Bell, Menu, Search } from 'lucide-react';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenMobileNav: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  onOpenMobileNav,
}) => {
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b bg-background px-3">
      <button
        type="button"
        onClick={onOpenMobileNav}
        className="rounded-md p-2 text-muted-foreground hover:bg-accent md:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-4 w-4" />
      </button>

      <div className="relative min-w-0 flex-1">
        <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search players, games, rewards..."
          className="h-8 w-full max-w-md rounded-md border border-input bg-background px-3 pl-8 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen((open) => !open)}
            className="relative rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>
          {notifOpen && (
            <div className="absolute right-0 z-50 mt-1 w-72 rounded-md border bg-popover p-4 text-sm shadow-md">
              <div className="font-medium">Notifications</div>
              <p className="mt-2 text-muted-foreground">No notifications</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-md px-2 py-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[11px] font-medium">
            AD
          </div>
          <div className="hidden leading-tight sm:block">
            <div className="text-sm font-medium">Admin</div>
            <div className="text-xs text-muted-foreground">PB Zone</div>
          </div>
        </div>
      </div>
    </header>
  );
};
