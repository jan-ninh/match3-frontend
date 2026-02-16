// src/features/grid/ui/cells/cellBaseClass.ts
export function getCellButtonClass(isBlocked: boolean): string {
  return [
    // IMPORTANT:
    // Cursor is controlled by the viewport root (.match3-viewport).
    // Cells must not override cursor, otherwise you get flicker (tile vs gap).
    'relative rounded-xl border border-slate-500/5 bg-transparent focus:outline-none cursor-inherit',
    isBlocked ? '' : 'shadow-sm',
  ].join(' ');
}
