// src/features/gameplay/ui/hud/objectives/Objective-01-Nodes.tsx
import type { HudObjective } from '@/features/gameplay/lib/hud/typesHud';

import { ObjectiveCard } from './shared/ObjectiveCard';
import { objectiveThemeNodes, objectiveThemeSpikes } from './shared/objectiveThemes';

type ObjectiveNodesLike = Extract<HudObjective, { kind: 'spikes' | 'nodes' }>;

type Props = {
  objective: ObjectiveNodesLike;
};

export function ObjectiveNodes({ objective }: Props) {
  const isSpikes = objective.kind === 'spikes';

  // Level 01 = spikes, Level 02+ = nodes (higher HP)
  const title = isSpikes ? 'Break the Firewall!' : 'Breach the Nodes!';
  const hint = isSpikes ? 'Match next to a Firewall to clear it.' : 'Match next to a node to damage it.';

  const done = objective.breachDone | 0;
  const total = objective.breachTotal | 0;

  const theme = isSpikes ? objectiveThemeSpikes : objectiveThemeNodes;

  return <ObjectiveCard title={title} hint={hint} statLabel="BREACH" done={done} total={total} theme={theme} />;
}
