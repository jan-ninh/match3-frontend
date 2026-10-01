import { DASHBOARD_STYLE as S } from './theme';

type Props = {
  /** 0..100 */
  percent: number;
  playerLevel: number;
  expCurrent: number;
  expRequired: number;
};

export default function ProgressBar({ percent, playerLevel, expCurrent, expRequired }: Props) {
  const safeLevel = Number.isFinite(playerLevel) ? Math.max(1, Math.floor(playerLevel)) : 1;
  const safeRequired = Number.isFinite(expRequired) && expRequired > 0 ? Math.floor(expRequired) : 3000;
  const safeCurrent = Number.isFinite(expCurrent) ? Math.min(safeRequired, Math.max(0, Math.floor(expCurrent))) : 0;
  const safePercent = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0;

  return (
    <div className={`${S.glass.full}`}>
      <div className="flex items-baseline justify-between gap-4 mb-2">
        <p className={`text-[13px] tracking-wide ${S.text.secondary}`}>Level {safeLevel}</p>
        <p className={`text-[12px] tracking-wide ${S.text.secondary}`}>EXP {safeCurrent.toLocaleString()}/{safeRequired.toLocaleString()}</p>
      </div>

      <div className={`${S.progress.track} ${S.progress.height} ${S.progress.radius} overflow-hidden`}>
        <div
          className={[
            S.progress.accent,
            S.progress.height,
            S.progress.radius,
            'relative',
            'after:absolute after:inset-0 after:bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.18)_45%,transparent_70%)] after:translate-x-[-40%] after:animate-[shimmer_2.4s_infinite]',
          ].join(' ')}
          style={{ width: `${safePercent}%` }}
        />
      </div>
    </div>
  );
}
