// src/features/devtools-host/ui/DevtoolsHost.tsx
import { GameplayRoot } from '@/features/gameplay/ui/GameplayRoot';
import DevtoolsScene from './DevtoolsScene';

type Props = {
  initialLevelId?: number;
};

export default function DevtoolsHost({ initialLevelId = 1 }: Props) {
  // Demo/presentation: in dev builds allow free level hopping even when the debug overlay is closed.
  const allowDevLevelHop = import.meta.env.DEV;

  return (
    <GameplayRoot initialLevelId={initialLevelId} allowDevLevelHop={allowDevLevelHop}>
      <DevtoolsScene />
    </GameplayRoot>
  );
}
