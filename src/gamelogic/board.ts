// src/gamelogic/board.ts

export { buildInitialBoard } from './board/build/buildInitialBoard';

export { getTerminalAt, isTerminalCell, canEnterTerminal, getTerminalIndices } from './board/terminals/terminals';

export {
  getObjectiveTerminalAt,
  isObjectiveTerminalCell,
  isObjectiveTerminalActiveAt,
  getObjectiveTerminalIndices,
} from './board/terminals/objectiveTerminals';

export { canSwap } from './board/swap/canSwap';
export { swapCellsImmutable, swapPiecesPositionsImmutable } from './board/swap/swapImmutable';

export { getOrthogonalNeighbors } from './board/math/neighbors';
export { manhattanDist } from './board/math/distance';

export { getNearestOpenLeakId, getSpreadCandidates } from './board/leaks/leakUtils';

export { countContamination, countSealKits } from './board/obstacles/counters';

export { canReceiveFallingPiece, blocksGravity } from './board/gravity/gravityRules';

// Level 05: Signal Network
export { isSignalLinked, countChargedCells, getSignalSourceIndices, getSignalTargetIndices } from './board/signal/signalPathCheck';
