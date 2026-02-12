export function getCellButtonClass(isBlocked: boolean): string {
  return [
    'relative rounded-xl border border-slate-500/5 bg-transparent focus:outline-none',
    isBlocked ? 'cursor-not-allowed' : 'cursor-pointer shadow-sm',
  ].join(' ');
}
