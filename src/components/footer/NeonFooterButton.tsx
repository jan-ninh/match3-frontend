// src/components/footer/NeonFooterButton.tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';

export type NeonFooterButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  /**
   * Visual-only "armed/active" state.
   * (Gameplay logic must stay engine-owned.)
   */
  active?: boolean;
  /**
   * Optional badge node (count or small icon).
   */
  badge?: ReactNode;
  children: ReactNode;
};

export const NeonFooterButton = forwardRef<HTMLButtonElement, NeonFooterButtonProps>(function NeonFooterButton(
  { active = false, badge, className, disabled, children, ...rest },
  ref,
) {
  const base =
    'relative isolate select-none rounded-2xl ' +
    // size + layout
    'w-[78px] h-[78px] shrink-0 ' +
    // glass body
    'bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03)_42%,rgba(0,0,0,0.20))] ' +
    'backdrop-blur-md ' +
    // border + shadow
    'border border-white/12 shadow-[0_10px_26px_rgba(0,0,0,0.45)] ' +
    // interactions
    'transition-[transform,box-shadow,border-color,filter,opacity] duration-150 ' +
    'hover:brightness-[1.08] active:scale-[0.985] ' +
    // focus
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/45';

  const neon =
    // outer glow layer
    'before:absolute before:inset-0 before:rounded-2xl before:content-[""] ' +
    'before:bg-[radial-gradient(110%_90%_at_50%_0%,rgba(34,211,238,0.22),rgba(244,63,94,0.08)_55%,rgba(0,0,0,0)_72%)] ' +
    'before:opacity-70 before:blur-[0px] ' +
    // scanline / sheen
    'after:absolute after:inset-0 after:rounded-2xl after:content-[""] ' +
    'after:bg-[linear-gradient(135deg,rgba(255,255,255,0.10),rgba(255,255,255,0.00)_35%,rgba(255,255,255,0.06)_70%)] ' +
    'after:opacity-60 after:mix-blend-overlay';

  const activeStyle =
    // stronger neon + ring + lifted
    'border-rose-400/55 shadow-[0_0_22px_rgba(244,63,94,0.20),0_14px_34px_rgba(0,0,0,0.55)] ' +
    'before:opacity-100 before:bg-[radial-gradient(120%_100%_at_50%_0%,rgba(244,63,94,0.22),rgba(34,211,238,0.12)_60%,rgba(0,0,0,0)_75%)] ' +
    'ring-1 ring-rose-400/25';

  const disabledStyle = 'opacity-45 cursor-not-allowed hover:brightness-100 active:scale-100';

  const cls = [base, neon, active ? activeStyle : '', disabled ? disabledStyle : '', className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <button ref={ref} type="button" className={cls} disabled={disabled} {...rest}>
      {/* inner frame */}
      <span
        className={[
          'absolute inset-[7px] rounded-[16px] border border-white/10',
          active ? 'border-rose-400/20' : 'border-white/8',
        ].join(' ')}
        aria-hidden="true"
      />

      {/* content */}
      <span className="relative z-10 flex items-center justify-center w-full h-full">{children}</span>

      {/* badge */}
      {badge != null ? (
        <span
          className={[
            'absolute -top-2 -right-2 z-20 grid place-items-center',
            'min-w-6 h-6 px-1 rounded-full',
            'text-[12px] font-semibold leading-none',
            'bg-slate-950/75 border border-white/12',
            'shadow-[0_0_14px_rgba(34,211,238,0.18)]',
            active ? 'border-rose-400/35 shadow-[0_0_14px_rgba(244,63,94,0.18)]' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {badge}
        </span>
      ) : null}

      {/* tiny bottom highlight */}
      <span
        className={[
          'absolute left-3 right-3 bottom-2 h-[2px] rounded-full',
          'bg-[linear-gradient(90deg,rgba(34,211,238,0.00),rgba(34,211,238,0.32),rgba(244,63,94,0.22),rgba(34,211,238,0.00))]',
          active ? 'opacity-100' : 'opacity-60',
        ].join(' ')}
        aria-hidden="true"
      />
    </button>
  );
});

NeonFooterButton.displayName = 'NeonFooterButton';

export default NeonFooterButton;
