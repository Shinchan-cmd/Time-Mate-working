import React from 'react';

interface LogoProps {
  className?: string;
  size?: number | string;
  showText?: boolean;
  theme?: 'dark' | 'light';
}

export const TimeMateLogoIcon: React.FC<{ size?: number | string; className?: string }> = ({
  size = 40,
  className = '',
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-xl overflow-hidden shadow-[0_0_15px_rgba(255,45,141,0.35)] shrink-0 border border-pink-500/30 ${className}`}
      style={{
        width: typeof size === 'number' ? `${size}px` : size,
        height: typeof size === 'number' ? `${size}px` : size,
        backgroundColor: '#0a0a0d',
      }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full p-1"
      >
        <defs>
          {/* Left Figure Electric Neon Pink Gradient */}
          <linearGradient id="tmLeftGrad" x1="20" y1="20" x2="50" y2="85" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ff2d8d" />
            <stop offset="60%" stopColor="#ff1493" />
            <stop offset="100%" stopColor="#ff4fa3" />
          </linearGradient>

          {/* Right Figure Magenta to Violet Gradient */}
          <linearGradient id="tmRightGrad" x1="50" y1="20" x2="80" y2="85" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#c026d3" />
            <stop offset="60%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>

          {/* Clock Hands Gradient */}
          <linearGradient id="tmClockGrad" x1="48" y1="46" x2="62" y2="66" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ff2d8d" />
            <stop offset="100%" stopColor="#ff4fa3" />
          </linearGradient>
        </defs>

        {/* Left Person Head */}
        <circle cx="39" cy="22" r="7.5" fill="url(#tmLeftGrad)" />

        {/* Right Person Head */}
        <circle cx="61" cy="22" r="7.5" fill="url(#tmRightGrad)" />

        {/* Left Person Body - forms left half of heart */}
        <path
          d="M 39 30.5 C 31 32 22 41 22 53.5 C 22 66 34 75 49 81.5 C 47.5 76 43 69 39 63 C 33 54 33 46 39 39 C 43 34.5 47 34 50 36 C 45 31.5 41 30.5 39 30.5 Z"
          fill="url(#tmLeftGrad)"
        />

        {/* Right Person Body */}
        <path
          d="M 61 30.5 C 69 32 78 41 78 53.5 C 78 66 66 75 51 81.5 C 52.5 76 57 69 61 63 C 67 54 67 46 61 39 C 57 34.5 53 34 50 36 C 55 31.5 59 30.5 61 30.5 Z"
          fill="url(#tmRightGrad)"
        />

        {/* Clock Center Pin in heart hollow */}
        <circle cx="50" cy="53" r="2.2" fill="url(#tmClockGrad)" />

        {/* Clock Hour Hand */}
        <line
          x1="50"
          y1="53"
          x2="50"
          y2="64"
          stroke="url(#tmClockGrad)"
          strokeWidth="3.2"
          strokeLinecap="round"
        />

        {/* Clock Minute Hand */}
        <line
          x1="50"
          y1="53"
          x2="59"
          y2="59"
          stroke="url(#tmClockGrad)"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

export const TimeMateFullLogo: React.FC<LogoProps> = ({
  size = 40,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <TimeMateLogoIcon size={size} />
      <div className="flex flex-col text-left">
        <div className="flex items-center font-black tracking-tight text-lg leading-none">
          <span className="text-white">Time</span>
          <span className="bg-gradient-to-r from-pink-500 via-pink-400 to-fuchsia-500 bg-clip-text text-transparent ml-0.5">
            Mate
          </span>
        </div>
        <span className="text-[10px] text-zinc-400 font-medium tracking-wide mt-0.5">
          Real connections. Your time.
        </span>
      </div>
    </div>
  );
};
