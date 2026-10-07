export const SCENARIO_KEYS = [
  'level1-redesign',
  'level2-redesign',
  'clean-room',
  'breach-protocol',
  'tiberium-run',
  'signal-breach',
  'false-identity',
  'patch-the-hole',
  'match-rush',
  'laserrow-match4-training',
  'stone-tiles-intro',
  'firewall-sweep-bossroom',
  'enemy-turn-trace',
  'sandbox',
] as const;

export type ScenarioKey = (typeof SCENARIO_KEYS)[number];
