import type { Cell, PieceId } from '@/gamelogic';
import type { Axis, PressState } from './types';

export type PreviewUiSetters = {
  setPreviewActive: (v: boolean) => void;
  setPreviewOtherPieceId: (id: PieceId | null) => void;
  setPreviewAxisUI: (axis: Axis | null) => void;
  setPreviewDirUI: (dir: -1 | 0 | 1) => void;
};

export function clearPreviewVisuals(ui: PreviewUiSetters): void {
  ui.setPreviewActive(false);
  ui.setPreviewOtherPieceId(null);
  ui.setPreviewAxisUI(null);
  ui.setPreviewDirUI(0);
}

export function latchPreview(
  p: PressState,
  axis: Axis,
  dir: -1 | 0 | 1,
  toIndex: number,
  cells: Cell[],
  ui: PreviewUiSetters,
): void {
  if (dir === 0) return;

  const otherPid = cells[toIndex]?.pieceId ?? null;
  if (otherPid === null) return;

  p.previewLatched = true;
  p.previewAxis = axis;
  p.previewDir = dir;
  p.previewToIndex = toIndex;

  ui.setPreviewActive(true);
  ui.setPreviewOtherPieceId(otherPid as PieceId);
  ui.setPreviewAxisUI(axis);
  ui.setPreviewDirUI(dir);
}

export function unlatchPreview(p: PressState, ui: PreviewUiSetters): void {
  p.previewLatched = false;
  p.previewAxis = null;
  p.previewDir = 0;
  p.previewToIndex = null;

  clearPreviewVisuals(ui);
}