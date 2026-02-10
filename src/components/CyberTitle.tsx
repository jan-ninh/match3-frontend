import React from 'react';

type TitleSize = 'sm' | 'md' | 'lg' | 'xl';

type CyberTitleProps = {
  children: React.ReactNode;
  size?: TitleSize;
  className?: string;
};

const sizeMap: Record<TitleSize, string> = {
  sm: 'text-xl md:text-2xl',
  md: 'text-3xl md:text-4xl',
  lg: 'text-4xl md:text-5xl',
  xl: 'text-5xl md:text-6xl',
};

export function CyberTitle({ children, size = 'lg', className = '' }: CyberTitleProps) {
  return (
    <h1
      className={`
        relative font-extrabold uppercase tracking-wider
        bg-linear-to-b from-cyan-600 via-purple-300 to-purple-900
        bg-clip-text text-transparent
        transition-transform duration-700
        ${sizeMap[size]}
        ${className}
      `}
      style={{
        filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.8)) ' + 'drop-shadow(0 0 20px rgba(236,72,153,0.75)) ' + 'drop-shadow(0 0 50px rgba(6,182,212,0.55))',
        WebkitTextStroke: '0.45px rgba(255,255,255,0.02)',
      }}
    >
      {children}

      {/* neon underline */}
      <span
        aria-hidden
        className="absolute left-1/2 -translate-x-1/2 bottom-[-0.6rem] h-1 rounded-full"
        style={{
          width: '6rem',
          background: 'linear-gradient(90deg, rgba(6,182,212,0.9), rgba(236,72,153,0.9))',
          boxShadow: '0 0 18px rgba(6,182,212,0.45), 0 0 30px rgba(236,72,153,0.35)',
        }}
      />
    </h1>
  );
}
