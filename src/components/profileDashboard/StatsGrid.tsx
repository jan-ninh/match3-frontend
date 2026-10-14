import GlassSection from '../GlassSection';
import { DASHBOARD_STYLE as S } from './theme';

type Stat = { label: string; value: string | number };
type Props = { stats: Stat[] };

export default function StatsGrid({ stats }: Props) {
  return (
    <GlassSection>
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100/45">Player Stats</p>
      </div>

      <div className={`grid grid-cols-2 ${S.layout.cardGap}`}>
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={[
              'bg-slate-950/25 backdrop-blur-sm',
              'border border-cyan-200/10 ring-1 ring-fuchsia-400/10',
              'rounded-2xl p-3',
              S.fx.hoverGlow,
              'text-center',
            ].join(' ')}
          >
            <p className={`text-[13px] tracking-wide ${S.text.secondary}`}>{stat.label}</p>
            <p className={`mt-1 text-xl font-semibold ${S.text.primary}`}>{stat.value}</p>
          </div>
        ))}
      </div>
    </GlassSection>
  );
}
