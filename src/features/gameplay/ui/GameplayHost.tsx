// src/features/gameplay/ui/GameplayHost.tsx
import GameplayScene from './GameplayScene';
import { GameplayRoot } from './GameplayRoot';

type Props = {
  initialLevelId?: number;
};

/**
 * Gameplay Composition Root.
 *
 * Milestone M4: Devtools is an optional wrapper that renders GameplayRoot.
 * GameplayHost must never import from devtools-host.
 */
export default function GameplayHost({ initialLevelId = 1 }: Props) {
  return (
    <GameplayRoot initialLevelId={initialLevelId}>
      <GameplayScene />
    </GameplayRoot>
  );
}
