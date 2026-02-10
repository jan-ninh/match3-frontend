import type { ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
};

export default function CyberButton({ label, className = '', type = 'button', ...props }: ButtonProps) {
  //   const hexClip = 'polygon(% 0%, 85% 0%, 100% 50%, 85% 100%, 15% 100%, 0% 50%)';
  const hexClip = 'polygon(20% 0%, 80% 0%, 92% 50%, 80% 100%, 20% 100%, 8% 50%)';

  return (
    <button type={type} className={`group relative w-80 md:w-96 h-16 transition-transform duration-500 hover:scale-105 ${className}`} {...props}>
      {/* Hex Background */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gray-900/90 backdrop-blur-md"
        style={{
          clipPath: hexClip,
          boxShadow: '0 0 30px rgba(236,72,153,0.6), 0 0 60px rgba(6,182,212,0.4)',
          transition: 'box-shadow 0.5s',
        }}
      />

      {/* Neon Stroke */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          clipPath: hexClip,
          border: '2px solid #ec4899',
          filter: 'drop-shadow(0 0 12px rgba(236,72,153,.8))',
        }}
      />

      {/* Inner cyan line */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          clipPath: hexClip,
          border: '1px solid rgba(6,182,212,.7)',
        }}
      />

      {/* Label */}
      <span className="relative z-10 flex h-full items-center justify-center text-2xl font-bold tracking-widest text-cyan-300 group-hover:text-pink-500 transition-colors duration-500">
        {label}
      </span>
    </button>
  );
}
