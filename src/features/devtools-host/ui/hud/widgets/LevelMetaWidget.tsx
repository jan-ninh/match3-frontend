type Props = {
  levelId: number;
};

export function LevelMetaWidget({ levelId }: Props) {
  return (
    <div
      className={[
        'pointer-events-auto',
        'rounded-2xl border border-white/10 bg-black/30 px-4 py-3',
        'backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.35)]',
      ].join(' ')}
    >
      <div className="text-[11px] uppercase tracking-wide text-white/55">Level</div>
      <div className="mt-0.5 flex items-baseline gap-2">
        <div className="text-lg font-semibold leading-tight text-white/90">{levelId}</div>
        <div className="text-[11px] uppercase tracking-wide text-white/45">Stage</div>
      </div>
    </div>
  );
}
