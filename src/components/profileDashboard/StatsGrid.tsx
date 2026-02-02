import { DASHBOARD_STYLE as S } from './theme';

type Stat = { label: string; value: string | number };
type Props = { stats: Stat[] };

export default function StatsGrid({ stats }: Props) {
  return (
    <div className={`grid grid-cols-2 gap-3 ${S.glass.full}`}>
      {stats.map((stat) => (
        <div key={stat.label} className={`${S.glass.bg} ${S.glass.blur} ${S.glass.border} ${S.glass.radius} ${S.glass.padding} text-center`}>
          <p className={`text-md ${S.text.muted}`}>{stat.label}</p>
          <p className={`text-lg font-semibold ${S.text.primary}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  );
}