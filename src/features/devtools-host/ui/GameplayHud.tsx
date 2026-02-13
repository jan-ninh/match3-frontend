// src/features/devtools-host/ui/GameplayHud.tsx
import { HudBar } from './hud/HudBar';
import { useGameplayHudActions } from '../lib/hud/useGameplayHudActions';
import { useGameplayHudModel } from '../lib/hud/useGameplayHudModel';
import type { GameplayHudInput } from '../lib/hud/types-hud';

export type GameplayHudProps = GameplayHudInput;

export default function GameplayHud(props: GameplayHudProps) {
  const model = useGameplayHudModel(props);
  const actions = useGameplayHudActions();

  return (
    <div className="w-full">
      <HudBar model={model} actions={actions} />
    </div>
  );
}
