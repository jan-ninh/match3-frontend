// src/features/gameplay/ui/GameplayHost.tsx
import DevtoolsHost from '@/features/devtools-host/ui/DevtoolsHost';

type Props = {
  initialLevelId?: number;
};

/**
 * Gameplay Composition Root.
 *
 * Milestone M1: temporary adapter that delegates to the existing implementation
 * (currently still located under `features/devtools-host`).
 *
 * Later milestones will move the implementation into `features/gameplay/*`
 * and keep Devtools as an optional wrapper.
 */
export default function GameplayHost({ initialLevelId = 1 }: Props) {
  return <DevtoolsHost initialLevelId={initialLevelId} />;
}
