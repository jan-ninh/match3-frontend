import type { HudObjective } from '@/features/gameplay/lib/hud/typesHud';

import { ObjectiveCard } from './shared/ObjectiveCard';
import { objectiveThemeNodes } from './shared/objectiveThemes';

type ObjectiveSignalBreachLike = Extract<HudObjective, { kind: 'signalBreach' }>;

type Props = {
  objective: ObjectiveSignalBreachLike;
};

export function ObjectiveSignalBreach({ objective }: Props) {
  const linked = objective.linked;
  const done = objective.breachDone | 0;
  const total = objective.breachTotal | 0;

  if (!linked) {
    return (
      <ObjectiveCard
        title="Connect the Firewalls!"
        hint="Build a charged path from A to B."
        statLabel="LINK"
        done={0}
        total={1}
        theme={objectiveThemeNodes}
      />
    );
  }

  const complete = total > 0 && done >= total;

  return (
    <ObjectiveCard
      title={complete ? 'Breach complete!' : 'Destroy the Firewalls!'}
      hint={complete ? 'Both firewall nodes are down.' : 'Match next to each active firewall to destroy it.'}
      statLabel="BREACH"
      done={done}
      total={total}
      theme={objectiveThemeNodes}
    />
  );
}
