// src/features/devtools-host/lib/hud/useGameplayHudActions.ts
import { useMemo } from 'react';
import type { HudActions } from './typesHud';

export function useGameplayHudActions(): HudActions {
  // Keep as stable object for future extension.
  return useMemo(() => ({}) satisfies HudActions, []);
}
