export function nativePixels(distance: number, nativeSize: number, renderedSize: number) {
  return renderedSize > 0 && nativeSize > 0 ? (distance * nativeSize) / renderedSize : distance;
}
export function boardPointerDelta(element: HTMLElement | null, dx: number, dy: number) {
  const board = element?.closest<HTMLElement>('[data-match3-level]');
  if (!board) return { dx, dy };
  const rect = board.getBoundingClientRect();
  return { dx: nativePixels(dx, board.offsetWidth, rect.width), dy: nativePixels(dy, board.offsetHeight, rect.height) };
}
