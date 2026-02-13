// src/gamelogic/board/build/initCellsFromLevel.ts
import type { Cell, LevelDefinition } from '../../types';

function isBlockedIndex(blocked: Set<number>, index: number): boolean {
  return blocked.has(index);
}

export function initCellsFromLevel(level: LevelDefinition): Cell[] {
  const { width, height } = level;

  const blocked = new Set(level.blockedIndices);

  const firewallMap = new Map<number, { hp: number }>(level.firewallNodes.map((n) => [n.index, { hp: n.hp }]));
  const gateSet = new Set(level.gateIndices);
  const leakMap = new Map<number, { id: number; required: number }>(
    level.leakNodes.map((n, i) => [n.index, { id: i, required: n.patchStepsRequired }]),
  );

  // Level 03+: Terminal positions (handled separately in state.ts for clean layering)
  const terminalSet = new Set(level.terminalNodes?.map((n) => n.index) ?? []);

  // Level 04+: Objective Terminal positions
  const objectiveTerminalSet = new Set(level.objectiveTerminalNodes?.map((n) => n.index) ?? []);

  const size = width * height;

  const cells: Cell[] = Array.from({ length: size }, (_, index) => {
    // Firewall
    const fw = firewallMap.get(index);
    if (fw) {
      return {
        blocked: true,
        pieceId: null,
        obstacle: { kind: 'firewall', hp: fw.hp, maxHp: fw.hp },
      };
    }

    // Gate
    if (gateSet.has(index)) {
      return {
        blocked: true,
        pieceId: null,
        obstacle: { kind: 'gate', open: false },
      };
    }

    // Leak
    const leak = leakMap.get(index);
    if (leak) {
      return {
        blocked: true,
        pieceId: null,
        obstacle: { kind: 'leak', id: leak.id, progress: 0, required: leak.required },
      };
    }

    // Terminal placeholder (actual obstacle set in state.ts)
    if (terminalSet.has(index)) {
      return {
        blocked: true,
        pieceId: null,
      };
    }

    // Objective Terminal placeholder (actual obstacle set in state.ts)
    if (objectiveTerminalSet.has(index)) {
      return {
        blocked: true,
        pieceId: null,
      };
    }

    // Normal cell
    return {
      blocked: isBlockedIndex(blocked, index),
      pieceId: null,
    };
  });

  return cells;
}
