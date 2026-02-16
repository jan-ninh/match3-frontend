// src/features/devtools-host/ui/hud/widgets/SettingsGearButton.tsx
import { useCallback } from 'react';

import { useOverlays } from '@/features/overlays/useOverlays';

type Props = {
  /**
   * Vite public asset path (default: /public/icons/settings-gear02.png)
   * -> runtime URL: /icons/settings-gear02.png
   */
  iconSrc?: string;
};

export function SettingsGearButton({ iconSrc = '/icons/settings-gear02.png' }: Props) {
  const overlays = useOverlays();

  const onClick = useCallback(() => {
    overlays.openSettings();
  }, [overlays]);

  return (
    <button
      type="button"
      aria-label="Open settings"
      title="Settings"
      onClick={onClick}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      className={[
        'group relative inline-flex items-center justify-center select-none',
        // comfortable hitbox (icon itself smaller)
        'w-80 h-80 rounded-lg',
        // interaction
        'cursor-pointer',
        // focus
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70',
      ].join(' ')}
    >
      {/* soft outer glow (fade out slower than fade in) */}
      <span
        aria-hidden="true"
        className={[
          'pointer-events-none absolute inset-0 rounded-lg',
          'bg-cyan-400/12 blur-md',
          // slow fade-out, quicker fade-in
          'opacity-0 transition-opacity duration-700 ease-out',
          'group-hover:duration-300 group-hover:opacity-100',
        ].join(' ')}
      />

      {/* gear icon */}
      <img
        src={iconSrc}
        alt=""
        aria-hidden="true"
        draggable={false}
        className={[
          'relative z-10 w-80 h-80 object-contain pointer-events-none',
          // rotate + edge glow
          'transition-[transform,filter] duration-700 ease-out',
          'group-hover:rotate-[20deg]',
          'group-hover:brightness-125',
          'group-hover:drop-shadow-[0_0_12px_rgba(34,211,238,0.85)]',
        ].join(' ')}
      />
    </button>
  );
}
