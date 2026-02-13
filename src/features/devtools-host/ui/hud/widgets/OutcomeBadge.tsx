type Props = {
  isWin: boolean;
  isLose: boolean;
};

export function OutcomeBadge({ isWin, isLose }: Props) {
  if (!isWin && !isLose) return null;

  const text = isWin ? 'WIN' : 'LOSE';
  const cls = isWin ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200' : 'border-rose-400/25 bg-rose-500/10 text-rose-200';

  return (
    <div
      className={[
        'pointer-events-auto',
        'rounded-2xl border px-4 py-2 text-sm font-bold tracking-wider',
        'backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.35)]',
        cls,
      ].join(' ')}
    >
      {text}
    </div>
  );
}
