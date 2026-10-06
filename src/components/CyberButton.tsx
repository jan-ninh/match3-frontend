import type { ButtonHTMLAttributes } from 'react';
import { useAudio } from '@/context/AudioContext';

type ButtonSize = 'xl' | 'lg' | 'md' | 'sm';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  size?: ButtonSize;
};

const sizeMap: Record<ButtonSize, string> = {
  xl: 'w-fit min-w-80 md:min-w-96 max-w-full h-16 px-14 text-2xl tracking-widest',
  lg: 'w-fit min-w-[280px] md:min-w-80 max-w-full h-[60px] px-12 text-xl tracking-wider',
  md: 'w-fit min-w-56 md:min-w-64 max-w-full h-12 px-10 text-lg tracking-wider',
  sm: 'w-fit min-w-[112px] max-w-full px-10 h-10 text-sm tracking-wide',
};

export default function CyberButton({ label, className = '', type = 'button', size = 'xl', onClick, disabled = false, ...props }: ButtonProps) {
  const { playClickSound } = useAudio();
  const hexClip = 'polygon(20% 0%, 80% 0%, 92% 50%, 80% 100%, 20% 100%, 8% 50%)';

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    playClickSound();
    onClick?.(e);
  };

  return (
    <button
      type={type}
      className={`cyber-button group relative select-none ${disabled ? 'cursor-default' : 'cursor-pointer'} ${sizeMap[size]} ${className}`}
      onClick={handleClick}
      disabled={disabled}
      {...props}
    >
      {/* Visual shell pops forward. Text remains outside and unscaled. */}
      <div
        aria-hidden
        className={`absolute inset-0 pointer-events-none transition-transform duration-150 ease-out will-change-transform ${
          disabled ? '' : 'group-hover:scale-[1.04]'
        }`}
      >
        <div
          className="absolute inset-0 bg-gray-900/90"
          style={{
            clipPath: hexClip,
            boxShadow: '0 0 30px rgba(236,72,153,0.6), 0 0 60px rgba(6,182,212,0.4)',
          }}
        />

        <svg className="absolute inset-0 h-full w-full text-cyan-300/40" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polygon points="20,0 80,0 92,50 80,100 20,100 8,50" fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </svg>

        <svg
          className={`absolute inset-0 h-full w-full text-cyan-200 opacity-0 transition-opacity duration-150 ease-out ${
            disabled ? '' : 'group-hover:opacity-100'
          }`}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ filter: 'drop-shadow(0 0 5px rgba(34, 211, 238, 0.75))' }}
        >
          <polygon points="20,0 80,0 92,50 80,100 20,100 8,50" fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>

      {/* Label stays at scale 1, so the text remains crisp. */}
      <span
        className={`relative z-10 flex h-full items-center justify-center whitespace-nowrap font-bold text-cyan-300 transition-colors duration-150 ease-out ${
          disabled ? '' : 'group-hover:text-pink-500'
        }`}
      >
        {label}
      </span>
    </button>
  );
}
