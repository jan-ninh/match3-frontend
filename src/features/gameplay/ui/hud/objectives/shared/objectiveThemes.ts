// src/features/gameplay/ui/hud/objectives/shared/objectiveThemes.ts
export type ObjectiveTheme = {
  keylineBase: string;
  glowBase: string;
  segOnBase: string;
};

// Level 01 (spikes)
export const objectiveThemeSpikes: ObjectiveTheme = {
  keylineBase: 'border-white/14',
  glowBase: 'shadow-[0_10px_26px_rgba(0,0,0,0.55),0_0_22px_rgba(255,255,255,0.08)]',
  segOnBase: 'bg-white/20 border-white/25',
};

// Level 02+ nodes
export const objectiveThemeNodes: ObjectiveTheme = {
  keylineBase: 'border-fuchsia-300/18',
  glowBase: 'shadow-[0_10px_26px_rgba(0,0,0,0.55),0_0_22px_rgba(217,70,239,0.12)]',
  segOnBase: 'bg-fuchsia-400/35 border-fuchsia-300/35',
};

// Level 04 terminals activation
export const objectiveThemeActivateTerminals: ObjectiveTheme = {
  keylineBase: 'border-rose-300/18',
  glowBase: 'shadow-[0_10px_26px_rgba(0,0,0,0.55),0_0_22px_rgba(244,63,94,0.12)]',
  segOnBase: 'bg-rose-400/35 border-rose-300/35',
};

// Level 05 deliver ID cards (keycards)
export const objectiveThemeDeliverIDcards: ObjectiveTheme = {
  keylineBase: 'border-sky-300/18',
  glowBase: 'shadow-[0_10px_26px_rgba(0,0,0,0.55),0_0_22px_rgba(56,189,248,0.12)]',
  segOnBase: 'bg-sky-400/35 border-sky-300/35',
};
