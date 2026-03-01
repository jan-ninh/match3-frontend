// src/features/gameplay/ui/hud/objectives/Objective-05-DeliverIDcards.tsx
import type { HudObjective } from '@/features/gameplay/lib/hud/typesHud';

import { ObjectiveCard, type ObjectiveDescItem } from './shared/ObjectiveCard';
import { objectiveThemeDeliverIDcards } from './shared/objectiveThemes';

type ObjectiveTerminalsLike = Extract<HudObjective, { kind: 'terminals' }>;

type Props = {
  objective: ObjectiveTerminalsLike;
};

export function ObjectiveTerminals({ objective }: Props) {
  const verified = objective.terminalsVerified | 0;
  const total = objective.terminalsTotal | 0;

  const isDone = total > 0 && verified >= total;

  const title = isDone ? 'All IDs verified!' : 'Deliver ID Cards';
  const hint = 'Only matching the Terminal’s color will charge it—then deliver a Keycard.';

  const terminalStates = objective.terminalStates ?? [];

  const descItems: ObjectiveDescItem[] = [];

  // Terminal chips (Level 03)
  if (terminalStates.length > 0) {
    descItems.push({
      key: 'terminalChips',
      node: (
        <div className="flex items-center gap-2 overflow-hidden shrink-0 max-w-[clamp(10ch,18vw,28ch)]">
          {terminalStates.map((t) => (
            <div
              key={t.id}
              className={[
                'flex items-center gap-1 px-2 py-0.5 rounded text-[10px] shrink-0',
                t.state === 'verified'
                  ? 'bg-emerald-500/20 text-emerald-200'
                  : t.state === 'open'
                    ? 'bg-sky-500/20 text-sky-200'
                    : 'bg-slate-500/20 text-slate-300',
              ].join(' ')}
              title={`T${t.id}: ${t.charge}/${t.required} (${t.state})`}
            >
              <span className="uppercase">{`T${t.id}`}</span>
              <span>
                {t.charge}/{t.required}
              </span>
              <span>{t.state === 'verified' ? '✓' : t.state === 'open' ? '⎆' : '🔒'}</span>
            </div>
          ))}
        </div>
      ),
    });
  }

  return (
    <ObjectiveCard
      title={title}
      hint={hint}
      statLabel="VERIFIED"
      done={verified}
      total={total}
      theme={objectiveThemeDeliverIDcards}
      descItems={descItems}
      containerClassName="pointer-events-auto"
    />
  );
}
