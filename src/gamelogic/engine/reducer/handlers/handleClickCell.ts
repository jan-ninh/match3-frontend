import type { EngineEvent, EngineState } from '../../../types';

import { canSwap } from '../../../board';
import { pushEvents, rejectSwap } from '../../events';
import { isSelectableCell, isStableIdle, selectionClearedIfNeeded } from '../../guards';
import { beginSwapAnimating } from '../../swapFlow';
import type { ClickCellAction } from '../actions';

export function handleClickCell(state: EngineState, action: ClickCellAction): EngineState {
  if (!isStableIdle(state)) return state;

  const clicked = action.index;

  if (state.selectedIndex === clicked) {
    const nextState: EngineState = { ...state, selectedIndex: null };
    return pushEvents(nextState, [{ type: 'selectionCleared' }]);
  }

  if (state.selectedIndex === null) {
    if (!isSelectableCell(state, clicked)) return state;
    const nextState: EngineState = { ...state, selectedIndex: clicked };
    return pushEvents(nextState, [{ type: 'select', index: clicked }]);
  }

  const from = state.selectedIndex;
  const to = clicked;

  const check = canSwap(from, to, state.width, state.cells);

  if (check.ok) {
    // route click-adjacent swap through the same anim pipeline
    return beginSwapAnimating(state, from, to, { forceSelectionCleared: true });
  }

  const nextSelected = isSelectableCell(state, clicked) ? clicked : null;
  const nextState: EngineState = { ...state, selectedIndex: nextSelected };

  const events: EngineEvent[] = [rejectSwap(from, to, check.reason), ...selectionClearedIfNeeded(state.selectedIndex, nextSelected)];

  if (nextSelected !== null) events.push({ type: 'select', index: nextSelected });

  return pushEvents(nextState, events);
}
