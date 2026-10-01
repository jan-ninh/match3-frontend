// src/features/devtools-host/lib/devtools/useDevOverlayState.ts
import { useEffect, useState } from 'react';

import { useDevHotkeys } from '../useDevHotkeys';

export type DevOverlayState = {
  debugEnabled: boolean;
  showMatches: boolean;
  showLockoutHints: boolean;
  onToggleShowMatches: () => void;
  onToggleShowLockoutHints: () => void;
};

export function useDevOverlayState(args: { isDev: boolean }): DevOverlayState {
  const [showLockoutHints, setShowLockoutHints] = useState(false);
  const [debugEnabled, setDebugEnabled] = useState(false);

  // DevTools: match hints overlay toggle
  const [showMatches, setShowMatches] = useState(false);

  useDevHotkeys({
    enabled: args.isDev,
    onToggle: () => {
      // Toggle DevTools overlay (debugEnabled). When opening, auto-enable match hints.
      setDebugEnabled((prev) => {
        const next = !prev;
        if (next) setShowMatches(true);
        return next;
      });
    },
  });

  // When DevTools closes, also close the match overlay (keeps UI consistent).
  useEffect(() => {
    if (debugEnabled) return;
    setShowMatches(false);
  }, [debugEnabled]);

  return {
    debugEnabled,
    showMatches,
    showLockoutHints,
    onToggleShowMatches: () => setShowMatches((v) => !v),
    onToggleShowLockoutHints: () => setShowLockoutHints((v) => !v),
  };
}
