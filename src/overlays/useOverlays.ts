import { useContext } from 'react';
import { OverlayContext } from './overlayContext';

export function useOverlays() {
  const ctx = useContext(OverlayContext);
  if (!ctx) throw new Error('useOverlays must be used inside <OverlayProvider>');
  return ctx.api;
}
