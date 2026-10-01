export const TILE_BASE_SHADOW_CLASS = 'shadow-[0_6px_16px_rgba(0,0,0,0.35)]';

export const KEYCARD_BASE_SHADOW_CLASS =
  'shadow-[0_6px_16px_rgba(0,0,0,0.35),0_0_12px_rgba(251,191,36,0.25)]';

export const KEYCARD_FALLBACK_STYLE = {
  background: 'linear-gradient(135deg, rgba(251,191,36,0.4) 0%, rgba(245,158,11,0.5) 100%)',
  border: '2px solid rgba(251,191,36,0.5)',
} as const;

export const KEYCARD_POP_CLASS = 'match3-keycard-pop';

export const KEYCARD_POP_CSS = `
@keyframes match3-keycard-pop {
  0%   { transform: scale(0.55); opacity: 0; filter: brightness(1.15) saturate(1.05); }
  55%  { transform: scale(1.08); opacity: 1; filter: brightness(1.45) saturate(1.15); }
  100% { transform: scale(1);    opacity: 1; filter: brightness(1)    saturate(1); }
}

.match3-keycard-pop {
  transform-origin: 50% 50%;
  animation: match3-keycard-pop 220ms cubic-bezier(0.2, 0.9, 0.2, 1) 1 both;
}

@media (prefers-reduced-motion: reduce) {
  .match3-keycard-pop { animation: none; }
}
`;
