// src\features\grid\ui\GridShell.tsx
// Das ist der ORT fuer POINTER
import type { CSSProperties, ReactNode, RefObject } from 'react';

import GridLockoutOverlay from './GridLockoutOverlay';

type CssVars = CSSProperties & { '--boardDim'?: number };

type Props = {
  shellStyle: CssVars;
  cursorClass: string;

  inputLocked: boolean;
  showLockoutHints: boolean;

  innerW: number;
  innerH: number;
  boardRef: RefObject<HTMLDivElement | null>;

  /**
   * If true, GridShell listens to pointer-move in the capture phase.
   * Use this only when an overlay can stopPropagation() on move events (e.g. targeting),
   * but you still need consistent hover/target updates.
   */
  capturePointerMove?: boolean;

  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerLeave: () => void;

  children: ReactNode;
};

export function GridShell({
  shellStyle,
  cursorClass,
  inputLocked,
  showLockoutHints,
  innerW,
  innerH,
  boardRef,
  capturePointerMove = false,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
  children,
}: Props) {
  return (
    <div
      className={`relative rounded-2xl p-3 border border-white/10 shadow-[0_18px_60px_rgba(0,0,0,0.55)] select-none ${cursorClass}`}
      style={shellStyle}
      // Releases must not be missed (even if an overlay stops propagation).
      onPointerUpCapture={onPointerUp}
      onPointerCancelCapture={onPointerCancel}
      // Move is conditional: capture only when targeting overlays may stop propagation.
      onPointerMoveCapture={capturePointerMove ? onPointerMove : undefined}
      onPointerMove={!capturePointerMove ? onPointerMove : undefined}
      onPointerLeave={onPointerLeave}
    >
      <GridLockoutOverlay active={inputLocked} show={showLockoutHints} />

      <div ref={boardRef} className="relative" style={{ width: innerW, height: innerH }}>
        <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ backgroundColor: 'rgb(0 0 0 / var(--boardDim, 0.35))' }} />
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.022) 40%, rgba(0,0,0,0.94) 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -18px 40px rgba(0,0,0,0.55)',
          }}
        />

        {children}
      </div>
    </div>
  );
}
