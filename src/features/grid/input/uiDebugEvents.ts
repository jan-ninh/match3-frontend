// src/features/grid/input/uiDebugEvents.ts
// UI-only debug events for Devtools Event log.
// IMPORTANT: These are NOT engine events; they are emitted by the Grid input layer (DEV only).

export const GRID_UI_DEBUG_EVENT = 'match3:gridUiDebugEvent';

export type GridUiDragOutcome = 'swap' | 'snapBack' | 'invalidSwap' | 'cancel';

export type GridUiDebugEvent =
  | {
      type: 'uiDragStart';
      pointerId: number;
      pieceId: number;
      fromIndex: number;
    }
  | {
      type: 'uiDragEnd';
      pointerId: number;
      pieceId: number;
      fromIndex: number;
      toIndex: number | null;
      outcome: GridUiDragOutcome;
    };

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object';
}

export function isGridUiDebugEvent(v: unknown): v is GridUiDebugEvent {
  if (!isRecord(v)) return false;

  const t = v.type;
  if (t === 'uiDragStart') {
    return (
      typeof v.pointerId === 'number' &&
      Number.isFinite(v.pointerId) &&
      typeof v.pieceId === 'number' &&
      Number.isFinite(v.pieceId) &&
      typeof v.fromIndex === 'number' &&
      Number.isFinite(v.fromIndex)
    );
  }

  if (t === 'uiDragEnd') {
    const outcome = v.outcome;
    const okOutcome = outcome === 'swap' || outcome === 'snapBack' || outcome === 'invalidSwap' || outcome === 'cancel';

    const toIndex = v.toIndex;
    const okToIndex = toIndex === null || (typeof toIndex === 'number' && Number.isFinite(toIndex));

    return (
      typeof v.pointerId === 'number' &&
      Number.isFinite(v.pointerId) &&
      typeof v.pieceId === 'number' &&
      Number.isFinite(v.pieceId) &&
      typeof v.fromIndex === 'number' &&
      Number.isFinite(v.fromIndex) &&
      okToIndex &&
      okOutcome
    );
  }

  return false;
}

export function dispatchGridUiDebugEvent(detail: GridUiDebugEvent): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<GridUiDebugEvent>(GRID_UI_DEBUG_EVENT, { detail }));
}
