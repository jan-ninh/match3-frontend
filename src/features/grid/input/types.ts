import type { PieceId } from "@/gamelogic";

export type Axis = "x" | "y";

export type InputIntent =
  | { type: "click"; index: number }
  | { type: "swap"; from: number; to: number };

export type PressState = {
  active: boolean;
  pointerId: number;

  fromIndex: number;

  // element that captured the pointer (for reliable release)
  captureEl: HTMLElement | null;

  // only draggable if the start cell has a piece and is not blocked
  draggable: boolean;
  pieceId: PieceId | null;

  startClientX: number;
  startClientY: number;

  // raw pointer delta
  rawDx: number;
  rawDy: number;

  // smoothed delta (exponential smoothing)
  smoothedDx: number;
  smoothedDy: number;

  hasExceededThreshold: boolean;

  // axis-lock
  axis: Axis | null;

  // "magnet" target: one legit neighbor (may be null if none/illegal)
  toIndex: number | null;

  // preview latch (visual swap)
  previewLatched: boolean;
  previewAxis: Axis | null;
  previewDir: -1 | 0 | 1;
  previewToIndex: number | null;
};
