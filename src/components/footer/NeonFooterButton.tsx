import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  children: ReactNode; // icon
  badge?: ReactNode; // count or small icon
};

export default function NeonFooterButton({ active = false, className = '', children, badge, type = 'button', ...props }: Props) {
  const isDisabled = !!props.disabled;

  return (
    <button
      {...props}
      type={type}
      aria-pressed={active}
      className={[
        // layout (same footprint)
        'group relative flex-1 min-w-0 aspect-13/10 min-h-12 max-h-20',
        'flex items-center justify-center rounded-xl overflow-hidden select-none mb-2',
        'backdrop-blur-md',

        // ✅(CyberButton vibe)

        'bg-[linear-gradient(135deg,rgba(236,72,153,0.22)_0%,rgba(6,182,212,0.16)_40%,rgba(15,23,42,0.55)_100%)]',
        'border-2  border-cyan-400/35 ',

        // neon frame layers (keep)
        "before:content-[''] before:absolute before:inset-0 before:rounded-xl before:pointer-events-none",
        'before:shadow-[0_0_0_1px_rgba(236,72,153,0.45)]',
        "after:content-[''] after:absolute after:inset-0.5 after:rounded-[10px] after:pointer-events-none",
        'after:shadow-[inset_0_0_0_1px_rgba(6,182,212,0.45)]',

        // soft neon glow
        isDisabled ? '' : 'ring-0',
        active
          ? 'before:shadow-[0_0_0_1px_rgba(236,72,153,0.75),0_0_24px_rgba(236,72,153,0.22)] after:shadow-[inset_0_0_0_1px_rgba(6,182,212,0.75),0_0_18px_rgba(6,182,212,0.18)]'
          : 'before:shadow-[0_0_0_1px_rgba(236,72,153,0.45),0_0_18px_rgba(236,72,153,0.10)] after:shadow-[inset_0_0_0_1px_rgba(6,182,212,0.45)]',

        // subtle scanline (optional, still flat)
        'bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.012)_0px,rgba(255,255,255,0.012)_1px,rgba(0,0,0,0)_14px,rgba(0,0,0,0)_28px)]',

        // focus
        // 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-600/60',

        // interactions
        isDisabled
          ? 'opacity-45 saturate-0 cursor-not-allowed'
          : 'transition duration-150 ease-out hover:-translate-y-0.5 hover:brightness-110 hover:border-pink-400/60 active:translate-y-0 active:scale-[0.98]',

        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* content */}
      <span className={['relative z-10', active ? 'drop-shadow-[0_0_12px_rgba(236,72,153,0.20)]' : ''].join(' ')}>{children}</span>

      {/* badge/count */}
      {badge && (
        <span className="absolute bottom-1 right-1 z-20 w-7 h-7 flex items-center justify-center rounded-md bg-black/45 border border-white/15 backdrop-blur text-[11px] font-semibold text-white/90">
          {badge}
        </span>
      )}
    </button>
  );
}
