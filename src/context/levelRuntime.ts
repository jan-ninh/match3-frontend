export const MATCH3_LEVEL_CHANGED_EVENT = 'match3:levelChanged' as const;

export type Match3LevelChangedDetail = Readonly<{
  levelId: number;
}>;

type Match3Window = Window & {
  __match3LevelId?: number;
};

export function getRuntimeLevelId(): number | null {
  if (typeof window === 'undefined') return null;
  const w = window as Match3Window;
  const v = w.__match3LevelId;
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v | 0;
}

/**
 * Writes the runtime level id into a shared window slot and emits a change event.
 * UI components can subscribe to `MATCH3_LEVEL_CHANGED_EVENT`.
 */
export function setRuntimeLevelId(levelId: number): void {
  if (typeof window === 'undefined') return;

  const id = levelId | 0;
  const w = window as Match3Window;

  if (w.__match3LevelId === id) return;

  w.__match3LevelId = id;
  window.dispatchEvent(
    new CustomEvent<Match3LevelChangedDetail>(MATCH3_LEVEL_CHANGED_EVENT, {
      detail: { levelId: id },
    }),
  );
}
