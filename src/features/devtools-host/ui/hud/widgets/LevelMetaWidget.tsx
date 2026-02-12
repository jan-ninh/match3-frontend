// src/features/devtools-host/ui/hud/widgets/LevelMetaWidget.tsx
type Props = {
  levelId: number;
};

export function LevelMetaWidget({ levelId }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-white/50">Level</div>
      <div className="text-lg font-semibold leading-tight text-white/90">{levelId}</div>
    </div>
  );
}
