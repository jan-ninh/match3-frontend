// src/features/devtools-host/ui/hud/objectives/Objective-04-ActivateTerminals.tsx
import type { HudObjective, HudObjectiveTerminalState } from '../../../lib/hud/typesHud';

import { ObjectiveCard, type ObjectiveDescItem } from './shared/ObjectiveCard';
import { objectiveThemeActivateTerminals } from './shared/objectiveThemes';

type ObjectiveActivatedTerminalsLike = Extract<HudObjective, { kind: 'objectiveTerminals' }>;

type Props = {
  objective: ObjectiveActivatedTerminalsLike;
};

function stateChipClass(state: HudObjectiveTerminalState['state']): string {
  switch (state) {
    case 'active':
      return 'bg-emerald-500/20 text-emerald-200';
    case 'inactive':
      return 'bg-white/5 text-white/70';
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export function ObjectiveActivateTerminals({ objective }: Props) {
  const active = objective.activated | 0;
  const total = objective.total | 0;
  const states = objective.states;

  const isDone = total > 0 && active >= total;

  const preTitle = 'Activate Terminals';
  const title = isDone ? 'All terminals activated!' : preTitle;

  const hint = 'Make matches adjacent to terminals to charge them. Watch the laser warning!';

  const showStateChips = states.length > 0;

  const descItems: ObjectiveDescItem[] = [];

  if (showStateChips) {
    descItems.push({
      key: 'terminalStateChips',
      node: (
        <div className="flex items-center gap-2 overflow-hidden shrink-0 max-w-[clamp(10ch,18vw,28ch)]">
          {states.map((t) => (
            <div
              key={t.id}
              className={['flex items-center gap-1 px-2 py-0.5 rounded text-[10px] shrink-0', stateChipClass(t.state)].join(' ')}
              title={`T${t.id}: ${t.charge}/${t.required} (${t.state})`}
            >
              <span className="uppercase">{`T${t.id}`}</span>
              <span>
                {t.charge}/{t.required}
              </span>
              <span>{t.state === 'active' ? '✓' : '⎆'}</span>
            </div>
          ))}
        </div>
      ),
    });
  }

  return <ObjectiveCard title={title} hint={hint} statLabel="ACTIVE" done={active} total={total} theme={objectiveThemeActivateTerminals} descItems={descItems} />;
}
