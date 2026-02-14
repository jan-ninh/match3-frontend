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
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={onPointerLeave}
    >
      <GridLockoutOverlay active={inputLocked} show={showLockoutHints} />

      <div ref={boardRef} className="relative" style={{ width: innerW, height: innerH }}>
        <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ backgroundColor: 'rgb(0 0 0 / var(--boardDim))' }} />
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
