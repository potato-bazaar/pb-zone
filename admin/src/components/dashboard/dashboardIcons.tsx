import React from 'react';

/** Solid glyphs for the dashboard; they take the same props lucide icons get from KpiCard. */
type IconProps = { className?: string; strokeWidth?: number | string };

const Svg = ({ className, children }: IconProps & { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    {children}
  </svg>
);

const WHITE = { fill: 'none', stroke: '#fff', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const UsersSolid = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="9" cy="7" r="4" />
    <path d="M1.5 20.5c0-4.1 3.3-7 7.5-7s7.5 2.9 7.5 7V21h-15z" />
    <circle cx="17.6" cy="8" r="3" />
    <path d="M17.4 13.2c3 .3 5.1 2.9 5.1 6.1V21h-4.4v-.5c0-2.9-1.1-5.4-3.1-7 .8-.3 1.6-.4 2.4-.3z" />
  </Svg>
);

export const GamepadSolid = (props: IconProps) => (
  <Svg {...props}>
    <path d="M7.6 6h8.8a5.6 5.6 0 0 1 5.6 5.6v3.3a3.3 3.3 0 0 1-5.9 2L14.6 15H9.4l-1.5 1.9a3.3 3.3 0 0 1-5.9-2v-3.3A5.6 5.6 0 0 1 7.6 6z" />
    <path d="M7.2 9.4v4.2M5.1 11.5h4.2" {...WHITE} strokeWidth={1.8} />
    <circle cx="15.6" cy="10.4" r="1.15" fill="#fff" />
    <circle cx="17.8" cy="12.7" r="1.15" fill="#fff" />
  </Svg>
);

export const PlaySolid = (props: IconProps) => (
  <Svg {...props}>
    <path d="M7 4.6c0-1.2 1.3-1.9 2.3-1.3l11 7.4c.9.6.9 2 0 2.6l-11 7.4c-1 .6-2.3-.1-2.3-1.3z" />
  </Svg>
);

export const GiftSolid = (props: IconProps) => (
  <Svg {...props}>
    <path d="M12 7.6C10.6 4.3 6.6 3 5.7 5.1 4.9 7 8 7.6 12 7.6zm0 0c1.4-3.3 5.4-4.6 6.3-2.5.8 1.9-2.3 2.5-6.3 2.5z" />
    <rect x="2.5" y="7.6" width="19" height="4.8" rx="1.2" />
    <rect x="4" y="13.6" width="16" height="8" rx="1.3" />
    <path d="M12 7.8v13.8" {...WHITE} strokeWidth={1.8} />
  </Svg>
);

export const ClaimSolid = (props: IconProps) => (
  <Svg {...props}>
    <path d="M6.3 2h7.9L19 6.8V13a6 6 0 0 0-5.9 9H6.3A1.8 1.8 0 0 1 4.5 20.2V3.8A1.8 1.8 0 0 1 6.3 2z" />
    <path d="M7.8 9.2h5.2M7.8 12.6h3.6" {...WHITE} strokeWidth={1.6} />
    <circle cx="18" cy="18" r="5" />
    <path d="M19.4 16.2h-2a1 1 0 0 0 0 2h1.2a1 1 0 0 1 0 2h-2.1M18 15.2v.9M18 20.2v.8" {...WHITE} strokeWidth={1.3} />
  </Svg>
);

export const QuestionSolid = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="10.5" />
    <path d="M9.3 9.4a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.3-2.7 4.1" {...WHITE} strokeWidth={2.1} />
    <circle cx="12" cy="17.6" r="1.3" fill="#fff" />
  </Svg>
);
