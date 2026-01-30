import { useContext } from 'react';
import { OverlayContext } from './OverlayProvider';

export function useOverlays() {
  const ctx = useContext(OverlayContext);
  if (!ctx) throw new Error('useOverlays must be used inside <OverlayProvider>');
  return ctx.api;
}
