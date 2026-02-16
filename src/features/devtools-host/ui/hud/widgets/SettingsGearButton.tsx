import { useCallback } from 'react';

import { useOverlays } from '@/features/overlays/useOverlays';

type Props = {
  /**
   * Optional override for the icon path.
   * Default uses the existing repo asset (`public/icons/setting.svg`).
   */
  iconSrc?: string;
};

export function SettingsGearButton({ iconSrc = '/icons/setting.svg' }: Props) {
  const overlays = useOverlays();

  const onClick = useCallback(() => {
    overlays.openSettings();
  }, [overlays]);

  return (
    <button
      //========================================
      // BUTTON
      //========================================
      type="button"
      aria-label="Open settings"
      title="Settings"
      onClick={onClick}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      className={[
        'group relative inline-flex items-center justify-center',
        // bigger hitbox than the icon itself
        'w-40 h-40 rounded-xl',
        // interaction
        'select-none cursor-pointer',
        // focus
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70',
      ].join(' ')}
    >
      {/* glow layer */}
      <span
        aria-hidden="true"
        className={[
          'pointer-events-none absolute inset-0 rounded-xl',
          'bg-cyan-400/15 blur-md',
          // slow fade-out, quicker fade-in
          'opacity-0 transition-opacity duration-500 group-hover:duration-200 group-hover:opacity-100',
        ].join(' ')}
      />
      {/* /======================================== */}
      {/* IMAGE BEARBEITEN */}
      {/* /======================================== */}
      <img
        src={iconSrc}
        alt=""
        aria-hidden="true"
        draggable={false}
        className={[
          'relative z-10 w-160 h-160 object-contain pointer-events-none',
          // rotate + edge glow
          'transition-[transform,filter] duration-300 group-hover:duration-150 ease-out',
          'group-hover:rotate-[20deg]',
          'group-hover:brightness-125',
          'group-hover:drop-shadow-[0_0_12px_rgba(34,211,238,0.85)]',
        ].join(' ')}
      />
    </button>
  );
}
