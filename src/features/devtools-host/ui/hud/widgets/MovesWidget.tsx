type Props = {
  movesLeftText: string;
};

export function MovesWidget({ movesLeftText }: Props) {
  return (
    <div className="min-w-[88px] text-center rounded-2xl border border-white/10 bg-black/45 backdrop-blur px-4 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.45)] justify-self-end">
      <div className="text-2xl font-semibold text-white/90 tabular-nums">{movesLeftText}</div>
      <div className="text-xs tracking-widest text-white/60 uppercase">Moves</div>
    </div>
  );
}
