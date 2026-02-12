// src/features/devtools-host/ui/hud/widgets/MovesWidget.tsx
type Props = {
  movesLeftText: string;
};

export function MovesWidget({ movesLeftText }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-white/50">Moves</div>
      <div className="text-lg font-semibold leading-tight text-white/90">{movesLeftText}</div>
    </div>
  );
}
