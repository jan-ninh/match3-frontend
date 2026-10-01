import { useEffect } from 'react';

export type UseTargetingCursorOpts = Readonly<{
  targeting: boolean;
}>;

// While in targeting mode (bomb/laser), force the crosshair cursor globally.
// - fixes "cursor disappears" when leaving the grid or hovering elements that set their own cursor.
export function useTargetingCursor({ targeting }: UseTargetingCursorOpts) {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const cls = 'match3-targeting-cursor';
    const root = document.documentElement;

    const styleId = 'match3-targeting-cursor-style';
    if (!document.getElementById(styleId)) {
      const el = document.createElement('style');
      el.id = styleId;
      el.textContent = `
.${cls},
.${cls} * {
  cursor: crosshair !important;
}
`.trim();
      document.head.appendChild(el);
    }

    if (targeting) root.classList.add(cls);
    else root.classList.remove(cls);

    return () => {
      root.classList.remove(cls);
    };
  }, [targeting]);
}
