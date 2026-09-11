import React from 'react';
import {
  BarChart3,
  Gamepad2,
  Gift,
  Home,
  Package,
  Settings,
  Trophy,
  Users,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';

const PRIMARY_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/games', label: 'Games', icon: Gamepad2 },
  { to: '/rewards', label: 'Rewards', icon: Gift },
  { to: '/players', label: 'Players', icon: Users },
  { to: '/winners', label: 'Winners', icon: Trophy },
  { to: '/orders', label: 'Orders / Claims', icon: Package },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const;

interface SidebarProps {
  onNavigate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate }) => {
  const itemClass = (isActive: boolean) =>
    cn(
      'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors duration-200',
      isActive
        ? 'bg-[#E8E8E8] font-medium text-black'
        : 'text-sidebar-foreground hover:bg-[#F4F4F4]',
    );

  return (
    <aside className="flex h-full w-52 shrink-0 flex-col border-r border-sidebar-border bg-background text-sidebar-foreground">
      <div className="flex h-12 items-center gap-2.5 px-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-[11px] font-semibold text-primary-foreground">
          PB
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">PB Zone</div>
          <div className="text-[11px] text-muted-foreground">Admin Panel</div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-1">
        {PRIMARY_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to !== '/games'}
            onClick={onNavigate}
            className={({ isActive }) => itemClass(isActive)}
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn('h-4 w-4', isActive ? 'text-foreground' : 'text-muted-foreground')} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-3 py-2 text-[11px] text-muted-foreground">
        PB Zone
      </div>
    </aside>
  );
};
