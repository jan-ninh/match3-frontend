// src/features/grid/ui/LaserWarningOverlay.tsx
import { useLaserOverlay, type LaserWarningLike } from './hooks/useLaserOverlay';

type Props = {
  warning: LaserWarningLike | null | undefined;
  innerW: number;
  innerH: number;
};

export function LaserWarningOverlay({ warning, innerW, innerH }: Props) {
  const rect = useLaserOverlay({ warning, innerW, innerH });
  if (!rect || !warning) return null;

  const isRow = warning.kind === 'row';

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {/* soft fill */}
      <div
        className="absolute rounded-xl animate-pulse"
        style={{
          ...rect,
          background: isRow
            ? 'linear-gradient(90deg, rgba(244,63,94,0.00) 0%, rgba(244,63,94,0.16) 18%, rgba(244,63,94,0.20) 50%, rgba(244,63,94,0.16) 82%, rgba(244,63,94,0.00) 100%)'
            : 'linear-gradient(180deg, rgba(244,63,94,0.00) 0%, rgba(244,63,94,0.16) 18%, rgba(244,63,94,0.20) 50%, rgba(244,63,94,0.16) 82%, rgba(244,63,94,0.00) 100%)',
          boxShadow: '0 0 26px rgba(244,63,94,0.18), 0 0 52px rgba(244,63,94,0.10)',
        }}
      />

      {/* crisp outline */}
      <div
        className="absolute rounded-xl"
        style={{
          ...rect,
          outline: '1px solid rgba(248,113,113,0.32)',
          boxShadow: 'inset 0 0 0 1px rgba(244,63,94,0.14)',
        }}
      />

      {/* subtle scanlines */}
      <div
        className="absolute rounded-xl opacity-70"
        style={{
          ...rect,
          background: isRow
            ? 'repeating-linear-gradient(90deg, rgba(255,255,255,0.00) 0px, rgba(255,255,255,0.00) 10px, rgba(255,255,255,0.06) 11px)'
            : 'repeating-linear-gradient(0deg, rgba(255,255,255,0.00) 0px, rgba(255,255,255,0.00) 10px, rgba(255,255,255,0.06) 11px)',
          mixBlendMode: 'screen',
        }}
      />
    </div>
  );
}
