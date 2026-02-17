// src/gamelogic/levels/levels.ts
import type { LevelDefinition, PieceType } from '../types';
import { deriveSeed } from '../rng';
import { makeLevel01 } from './level-01';
import { makeLevel02 } from './level-02';
import { makeLevel03 } from './level-03';
import { makeLevel04 } from './level-04';
import { makeLevel05 } from './level-05';
import { makeLevel06 } from './level-06';
import { makeLevel07 } from './level-07';
import { makeLevel08 } from './level-08';
import { makeLevel09 } from './level-09';
import { makeLevel10 } from './level-10';
import { makeLevel11 } from './level-11';
import { makeLevel12 } from './level-12';

const DEFAULT_TYPES: PieceType[] = ['blue', 'green', 'purple', 'orange', 'cyan', 'yellow'];
const BASE_SEED = 12345;

function makeFallbackLevel(levelId: number): LevelDefinition {
  const width = 8;
  const height = 8;
  const moves = 14;
  const seed = deriveSeed(BASE_SEED, levelId);

  return {
    id: levelId,
    width,
    height,
    moves,
    allowedTypes: DEFAULT_TYPES,
    blockedIndices: [],
    firewallNodes: [],
    gateIndices: [],
    leakNodes: [],
    terminalNodes: [],
    keycardNodes: [],
    baseSeed: seed,
  };
}

export function getLevelDefinition(levelId: number): LevelDefinition {
  switch (levelId) {
    // Level 1: CLEAN ROOM (Spikes HP1)
    case 1:
      return makeLevel01({ baseSeed: BASE_SEED, allowedTypes: DEFAULT_TYPES });

    // Level 2: BREACH PROTOCOL (Nodes HP2)
    case 2:
      return makeLevel02({ baseSeed: BASE_SEED, allowedTypes: DEFAULT_TYPES });

    // Level 3: FALSE IDENTITY (Terminals + Keycards)
    case 3:
      return makeLevel03({ baseSeed: BASE_SEED, allowedTypes: DEFAULT_TYPES });

    // Level 4: FIREWALL SWEEP (Boss - Laser + Objective Terminals)
    case 4:
      return makeLevel04({ baseSeed: BASE_SEED, allowedTypes: DEFAULT_TYPES });

    // Level 5: SIGNAL HIJACK (Build conductive path from Source to Target)
    case 5:
      return makeLevel05({ baseSeed: BASE_SEED, allowedTypes: DEFAULT_TYPES });

    // Level 6: PATCH THE HOLE (Leaks + Contamination) — moved back from old Level 2
    case 6:
      return makeLevel06({ baseSeed: BASE_SEED, allowedTypes: DEFAULT_TYPES });

    case 7:
      return makeLevel07({ baseSeed: BASE_SEED, allowedTypes: DEFAULT_TYPES });
    case 8:
      return makeLevel08({ baseSeed: BASE_SEED, allowedTypes: DEFAULT_TYPES });
    case 9:
      return makeLevel09({ baseSeed: BASE_SEED, allowedTypes: DEFAULT_TYPES });
    case 10:
      return makeLevel10({ baseSeed: BASE_SEED, allowedTypes: DEFAULT_TYPES });
    case 11:
      return makeLevel11({ baseSeed: BASE_SEED, allowedTypes: DEFAULT_TYPES });
    case 12:
      return makeLevel12({ baseSeed: BASE_SEED, allowedTypes: DEFAULT_TYPES });

    default:
      return makeFallbackLevel(levelId);
  }
}
