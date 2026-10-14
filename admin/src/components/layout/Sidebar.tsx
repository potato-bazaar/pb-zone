import React from 'react';
import {
  BarChart3,
  CircleHelp,
  CopyCheck,
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
import { sidebarMascot } from '../dashboard/gameVisuals';

const PRIMARY_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: Home, solidActive: true },
  { to: '/games', label: 'Games', icon: Gamepad2 },
  { to: '/tater-match', label: 'Tater Match', icon: CopyCheck },
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

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate }) => (
  <aside className="flex h-full w-[264px] shrink-0 flex-col border-r border-[#EDF2EE] bg-white lg:w-[232px] 2xl:w-[250px]">
    <div className="flex items-center gap-3 px-5 pb-4 pt-5 2xl:px-[22px] 2xl:pt-[22px]">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-b from-[#0B5A25] to-[#03401A] text-[22px] font-extrabold tracking-tight text-[#FFD43B] shadow-[inset_0_-3px_0_rgba(0,0,0,0.2)] 2xl:h-[58px] 2xl:w-[58px] 2xl:rounded-2xl 2xl:text-[26px]">
        PB
      </div>
      <div className="min-w-0 leading-tight">
        <div className="truncate text-xl font-bold text-[#0B1A13] 2xl:text-[22px]">PB Zone</div>
        <div className="mt-0.5 text-sm text-[#64748B] 2xl:text-[15px]">Admin Panel</div>
      </div>
    </div>

    <nav className="shrink-0 space-y-0.5 px-3 py-1 2xl:px-[13px]">
      {PRIMARY_NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to !== '/games'}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex w-full items-center gap-4 rounded-xl px-[18px] py-2 text-base transition-colors duration-200 2xl:py-2.5 2xl:text-[17px]',
              isActive ? 'bg-[#E0F7E5] font-bold text-[#14532D]' : 'font-medium text-[#334155] hover:bg-[#F2FAF4]',
            )
          }
        >
          {({ isActive }) => (
            <>
              <item.icon
                className={cn('h-[22px] w-[22px] shrink-0 2xl:h-6 2xl:w-6', isActive ? 'text-[#14532D]' : 'text-[#475569]')}
                {...(isActive && 'solidActive' in item
                  ? { fill: 'currentColor', stroke: '#fff', strokeWidth: 1.5 }
                  : { strokeWidth: isActive ? 2.25 : 1.75 })}
              />
              <span className="truncate">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>

    <div aria-hidden className="sidebar-mascot relative min-h-0 flex-1 overflow-hidden">
      <div className="sidebar-mascot-art absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(85%_75%_at_38%_88%,#FFF2B8_0%,#FFF8DA_42%,rgba(255,255,255,0)_74%)]" />
        <img
          src={sidebarMascot}
          alt=""
          draggable={false}
          className="absolute -right-2 bottom-1 w-[132px] select-none drop-shadow-[0_6px_10px_rgba(120,80,0,0.15)] 2xl:w-[146px]"
        />
        <p className="absolute bottom-7 left-5 w-[118px] text-[15px] font-extrabold leading-[1.3] text-[#14532D] 2xl:left-6 2xl:text-base">
          Good games create happier communities
        </p>
      </div>
    </div>

    <div className="relative z-10 flex shrink-0 items-center gap-3 rounded-tl-[26px] rounded-tr-[10px] bg-white px-6 py-4 shadow-[0_-10px_24px_-14px_rgba(15,23,42,0.18)] 2xl:py-6">
      <CircleHelp className="h-8 w-8 shrink-0 text-[#CBD5E1]" fill="currentColor" stroke="#fff" strokeWidth={1.75} />
      <div className="min-w-0 leading-tight">
        <div className="text-[15px] font-bold text-[#0B1A13]">PB Zone</div>
        <div className="mt-0.5 text-sm text-[#64748B]">Admin Panel</div>
      </div>
    </div>
  </aside>
);
