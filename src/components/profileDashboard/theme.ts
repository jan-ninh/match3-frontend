// src/components/dashboard/theme.ts
export const DASHBOARD_STYLE = {
  glass: {
    // Base panel look (use in GlassSection)
    bg: 'bg-gradient-to-br from-slate-950/55 via-slate-950/40 to-slate-900/25',
    blur: 'backdrop-blur-md',
    border: 'border border-cyan-200/10 ring-1 ring-fuchsia-400/10 shadow-[0_0_24px_rgba(34,211,238,0.10),0_0_40px_rgba(236,72,153,0.06)]',
    radius: 'rounded-2xl',
    padding: 'p-4',
    full: 'w-full',

    // One-liner convenience
    panel:
      'w-full bg-gradient-to-br from-slate-950/55 via-slate-950/40 to-slate-900/25 backdrop-blur-md border border-cyan-200/10 ring-1 ring-fuchsia-400/10 rounded-2xl shadow-[0_0_24px_rgba(34,211,238,0.10),0_0_40px_rgba(236,72,153,0.06)]',
  },

  text: {
    primary: 'text-white/85',
    secondary: 'text-cyan-100/45',
    muted: 'text-white/70',
  },

  progress: {
    track: 'bg-slate-950/40 border border-white/10 ring-1 ring-cyan-300/10 shadow-[inset_0_0_18px_rgba(0,0,0,0.35)]',
    height: 'h-2.5',
    radius: 'rounded-full',
    accent: 'bg-gradient-to-r from-cyan-400 via-emerald-400 to-fuchsia-400 shadow-[0_0_18px_rgba(34,211,238,0.25),0_0_24px_rgba(236,72,153,0.15)]',
  },

  badge: {
    size: 'w-20 h-20',
    unlocked: 'opacity-100 saturate-110 drop-shadow-[0_0_14px_rgba(34,211,238,0.30)]',
    locked: 'opacity-25 grayscale',
  },

  fx: {
    scanlines:
      'relative before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:bg-[linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] before:bg-[length:100%_10px] before:opacity-[0.08]',
    hoverGlow:
      'transition duration-300 hover:border-cyan-200/20 hover:ring-cyan-300/20 hover:shadow-[0_0_28px_rgba(34,211,238,0.14),0_0_44px_rgba(236,72,153,0.10)]',
  },

  layout: {
    section: 'space-y-3',
    cardGap: 'gap-3',
  },

  button: {
    ghost: 'text-cyan-200/60 hover:text-cyan-100 transition underline-offset-4 hover:underline',
  },
};
