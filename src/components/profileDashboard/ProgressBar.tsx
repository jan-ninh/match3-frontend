import { DASHBOARD_STYLE as S } from './theme';

type Props = { percent: number };

export default function ProgressBar({ percent }: Props) {
  return (
    <div className="w-full max-w-4xl bg-white/50 p-4 rounded-lg">
      <div className={`${S.progress.track} ${S.progress.height} ${S.progress.radius}`}>
        <div className={`${S.progress.accent} ${S.progress.height} ${S.progress.radius}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}