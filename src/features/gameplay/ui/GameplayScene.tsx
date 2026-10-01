// src/features/gameplay/ui/GameplayScene.tsx
import GameContainer from './GameContainer';
import { useGameplayRuntime } from './GameplayRoot';

export default function GameplayScene() {
  const { state, inputLocked, canSwapAt, onIntent, onDevLose } = useGameplayRuntime();

  return (
    <GameContainer
      state={state}
      inputLocked={inputLocked}
      canSwapAt={canSwapAt}
      onIntent={onIntent}
      onTimeExpired={onDevLose}
    />
  );
}
