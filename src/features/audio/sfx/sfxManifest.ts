/**
 * Public URL-based SFX manifest.
 * - points to files in /public so missing files won't break builds
 * - you can drop multiple formats for max compatibility (mp3 + ogg + m4a)
 *
 * Loader tries in order until one works (404 or unsupported codec => fallback).
 *
 * IMPORTANT: URLs must respect Vite's BASE_URL so deployments under a sub-path work.
 * (Using leading '/' would bypass BASE_URL and 404 on e.g. '/myapp/'.)
 */

function withBase(path: string): string {
  // Vite guarantees BASE_URL to end with '/' (e.g. '/', '/myapp/').
  const base = import.meta.env.BASE_URL ?? '/';
  const clean = path.startsWith('/') ? path.slice(1) : path;
  return base.endsWith('/') ? `${base}${clean}` : `${base}/${clean}`;
}

function urls(...paths: readonly string[]): readonly string[] {
  return paths.map(withBase);
}

export const SFX_URLS = {
  // Items
  bombExplosion: urls('audio/sfx/items/bomb/bomb_laserSFX.mp3', 'audio/sfx/items/bomb/bomb_laserSFX.ogg', 'audio/sfx/items/bomb/bomb_laserSFX.m4a'),

  // Laser (Row-Clear Item)
  // NOTE: laserRow is the "legacy" strike sound id (kept for backwards compatibility).
  laserRow: urls('audio/sfx/items/laser/laser.mp3', 'audio/sfx/items/laser/laser.ogg', 'audio/sfx/items/laser/laser.m4a'),

  // Laser (Targeting + Confirm)
  // GOAL PIN assets (public/):
  // - public/audio/sfx/items/laser/laser_targeting.mp3
  // - public/audio/sfx/items/laser/laser_confirm.mp3
  //
  // Only mp3 is referenced here because those files are guaranteed to exist per GOAL PIN.
  // (You can add .ogg/.m4a later with zero code changes.)
  laserTargeting: urls('audio/sfx/items/laser/laser_targeting.mp3'),
  laserConfirm: urls('audio/sfx/items/laser/laser_confirm.mp3'),

  reshuffle: urls('audio/sfx/items/reshuffle/reshuffle.mp3', 'audio/sfx/items/reshuffle/reshuffle_SFX.ogg', 'audio/sfx/items/reshuffle/reshuffle_SFX.wav'),

  // Ingame
  // GOAL PIN asset (public/):
  // - public/audio/sfx/ingame/game_win_jingle.mp3
  gameWinJingle: urls('audio/sfx/ingame/game_win_jingle.mp3'),

  // UI
  // TEMP: maps to an existing SFX so hover works immediately.
  // Replace with e.g. audio/sfx/ui/settings_hover_01.* once you add the real asset.
  uiSettingsHover: urls('audio/sfx/matches/match3_pop_02.mp3', 'audio/sfx/ui/settings_hover_01.ogg', 'audio/sfx/ui/settings_hover_01.wav'),

  // Match 3+ pops (randomized by the caller for variation)
  matchPop01: urls('audio/sfx/matches/match3_pop_01.mp3', 'audio/sfx/matches/match3_pop_01.ogg', 'audio/sfx/matches/match3_pop_01.wav'),
  matchPop02: urls('audio/sfx/matches/match3_pop_02.mp3', 'audio/sfx/matches/match3_pop_02.ogg', 'audio/sfx/matches/match3_pop_02.wav'),

  // Match 4/5 reward stingers
  // GOAL PIN assets (public/):
  // - public/audio/sfx/matches/match4_chime.mp3
  // - public/audio/sfx/matches/match5_sting.mp3
  match4Chime: urls('audio/sfx/matches/match4_chime.mp3'),
  match5Sting: urls('audio/sfx/matches/match5_sting.mp3'),

  // Objective hit “stinger” (randomized by the caller)
  // NOTE: GOAL PIN lists match_objective_01 twice; keep both entries mapped to the same file for now.
  matchObjective01: urls('audio/sfx/matches/match_objective_01.mp3', 'audio/sfx/matches/match_objective_01.ogg', 'audio/sfx/matches/match_objective_01.wav'),
  matchObjective02: urls('audio/sfx/matches/match_objective_01.mp3', 'audio/sfx/matches/match_objective_01.ogg', 'audio/sfx/matches/match_objective_01.wav'),
  // Objective: Firewall/Node hit (randomized by the caller)
  firewallBreakV01: urls('audio/sfx/objectives/firewall_break_v01.wav'),
  firewallBreakV02: urls('audio/sfx/objectives/firewall_break_v02.wav'),
  firewallBreakV03: urls('audio/sfx/objectives/firewall_break_v03.wav'),
  firewallBreakV04: urls('audio/sfx/objectives/firewall_break_v04.wav'),
  firewallBreakV05: urls('audio/sfx/objectives/firewall_break_v05.wav'),
  firewallBreakV06: urls('audio/sfx/objectives/firewall_break_v06.wav'),
  firewallBreakV07: urls('audio/sfx/objectives/firewall_break_v07.wav'),
  firewallBreakV08: urls('audio/sfx/objectives/firewall_break_v08.wav'),
  firewallBreakV09: urls('audio/sfx/objectives/firewall_break_v09.wav'),
} as const;

export type SfxId = keyof typeof SFX_URLS;

// Optional alias (helps readability in other modules)
export const SFX_SOURCES = SFX_URLS;

// Single Source of Truth: "critical" SFX you want warmed up ASAP.
export const CORE_SFX: readonly SfxId[] = [
  'bombExplosion',
  'laserRow',
  'laserTargeting',
  'laserConfirm',
  'reshuffle',
  'gameWinJingle',
  'uiSettingsHover',
  'matchPop01',
  'matchPop02',
  'match4Chime',
  'match5Sting',
  'matchObjective01',
  'matchObjective02',

  'firewallBreakV01',
  'firewallBreakV02',
  'firewallBreakV03',
  'firewallBreakV04',
  'firewallBreakV05',
  'firewallBreakV06',
  'firewallBreakV07',
  'firewallBreakV08',
  'firewallBreakV09',
] as const;
