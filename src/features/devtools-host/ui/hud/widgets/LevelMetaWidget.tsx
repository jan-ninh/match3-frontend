type Props = {
  levelId: number;
};

export function LevelMetaWidget({ levelId }: Props) {
  return (
    <div
      data-ui="level-badge"
      className="min-w-[112px] text-center rounded-2xl border border-fuchsia-400/20 bg-black/45 backdrop-blur px-4 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.45),0_0_24px_rgba(217,70,239,0.16)] justify-self-start"
    >
      <div className="text-2xl font-semibold text-white/90 tabular-nums tracking-wide whitespace-nowrap inline-flex">LEVEL {levelId}</div>
      <div className="text-xs tracking-widest text-fuchsia-200/70 uppercase">Stage</div>
    </div>
  );
}
