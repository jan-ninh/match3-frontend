import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { EngineEvent } from '@/gamelogic';
import { CAMPAIGN_DEBUG_EVENT, type CampaignDebugDetail } from '@/context/campaignEvents';

function fmtNum(n: number): string {
  return Number.isFinite(n) ? n.toFixed(1) : 'NaN';
}

function fmtSigned(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${fmtNum(n)}`;
}

function fmtList(nums: number[]): string {
  return nums.length ? nums.join(',') : '-';
}

function fmtIdShort(id: string | null | undefined): string {
  if (!id) return '-';
  if (id.length <= 10) return id;
  return `${id.slice(0, 8)}…`;
}

function fmtSend(s: CampaignDebugDetail['lastSend'] | null | undefined): string {
  if (!s) return '—';
  const ok = s.ok ? 'ok' : 'FAIL';
  const msg = s.message ? `: ${s.message}` : '';
  return `${s.kind} ${ok}${msg}`;
}

function formatEvent(e: EngineEvent): string {
  switch (e.type) {
    case 'seededInit':
      return `seededInit(level=${e.levelId}, ${e.width}x${e.height}, seed=${e.seed})`;
    case 'reset':
      return `reset(level=${e.levelId}, seed=${e.seed})`;
    case 'hardBoundary':
      return `hardBoundary(${e.kind}, now=${fmtNum(e.nowMs)}ms, tokenBase=${e.animTokenBase})`;
    case 'phase':
      return `phase(${e.phase})`;
    case 'select':
      return `select(index=${e.index})`;
    case 'selectionCleared':
      return 'selectionCleared()';
    case 'swap':
      return `swap(from=${e.from}, to=${e.to})`;
    case 'swapBack':
      return `swapBack(from=${e.from}, to=${e.to})`;
    case 'animBegin':
      return `animBegin(kind=${e.kind}, token=${e.token}, dur=${fmtNum(e.durationMs)}ms, t=${fmtNum(e.enteredAtMs)}ms, ddl=${fmtNum(e.deadlineAtMs)}ms)`;
    case 'animDone':
      return `animDone(${e.mode}, kind=${e.kind}, token=${e.token}, dt=${fmtNum(e.dtMs)}ms, delta=${fmtSigned(e.deltaMs)}ms)`;
    case 'animDoneIgnored':
      return `animDoneIgnored(kind=${e.kind}, token=${e.token}, reason=${e.reason})`;
    case 'swapRejected':
      return `swapRejected(from=${e.from}, to=${e.to}, reason=${e.reason})`;
    case 'matchesFound':
      return `matchesFound(clears=${e.clears}, groups=${e.groups})`;
    case 'cleared':
      return `cleared(count=${e.count})`;
    case 'gravity':
      return 'gravity()';
    case 'refilled':
      return `refilled(count=${e.count})`;
    case 'deadlockCheck':
      return `deadlockCheck(hasMove=${String(e.hasMove)})`;
    case 'shuffled':
      return `shuffled(attempts=${e.attempts})`;
    case 'movesSpent':
      return `movesSpent(left=${e.left})`;
    case 'firewallDamaged':
      return `firewallDamaged(index=${e.index}, hp=${e.hp})`;
    case 'firewallDestroyed':
      return `firewallDestroyed(index=${e.index})`;
    case 'gateOpened':
      return 'gateOpened()';
    case 'win':
      return 'win()';
    case 'lose':
      return 'lose()';

    // ─────────────────────────────────
    // Misc / newer events
    // ─────────────────────────────────
    case 'cellCharged':
      return `cellCharged(index=${e.index})`;
    case 'signalLinked':
      return 'signalLinked()';

    case 'itemAccepted': {
      return `itemAccepted(key=${e.key}, target=${e.target.x},${e.target.y}, requestId=${e.requestId})`;
    }

    case 'cascadeStep': {
      if (e.kind === 'itemLaserRowClear') {
        return `cascadeStep(laserRowClear,row=${e.row}, cleared=${e.cleared}, indices=[${fmtList(e.indices)}])`;
      }
      const _exhaustive: never = e;
      return JSON.stringify(_exhaustive);
    }

    case 'powerUsed': {
      const req = typeof e.requestId === 'number' ? e.requestId : 0;
      return `powerUsed(key=${e.key}, requestId=${req})`;
    }

    // ─────────────────────────────────
    // Level 02+: Leak/Contamination
    // ─────────────────────────────────
    case 'turnEnd':
      return `turnEnd(turnIndex=${e.turnIndex})`;
    case 'spreadTick':
      return `spreadTick(leakId=${e.leakId}, targetIndex=${e.targetIndex ?? 'null'})`;
    case 'contaminationSpawned':
      return `contaminationSpawned(index=${e.index}, leakId=${e.leakId})`;
    case 'contaminationCleared':
      return `contaminationCleared(indices=[${fmtList(e.indices)}])`;
    case 'sealKitSpawned':
      return `sealKitSpawned(index=${e.index}, leakId=${e.leakId})`;
    case 'sealKitTriggered':
      return `sealKitTriggered(index=${e.index}, targetLeakId=${e.targetLeakId})`;
    case 'leakPatched':
      return `leakPatched(leakId=${e.leakId}, progress=${e.progress}/${e.required})`;
    case 'leakSealed':
      return `leakSealed(leakId=${e.leakId})`;
    case 'contaminationLose':
      return `contaminationLose(count=${e.count})`;

    // ─────────────────────────────────
    // Level 03+: Terminal/Keycard
    // ─────────────────────────────────
    case 'terminalCharged':
      return `terminalCharged(id=${e.terminalId}, charge=${e.charge}/${e.requiredCharge})`;
    case 'terminalOpened':
      return `terminalOpened(id=${e.terminalId})`;
    case 'keycardDelivered':
      return `keycardDelivered(terminalId=${e.terminalId}, keycardIndex=${e.keycardIndex})`;
    case 'terminalVerified':
      return `terminalVerified(id=${e.terminalId})`;

    // ─────────────────────────────────
    // Level 04+: Objective Terminal
    // ─────────────────────────────────
    case 'objectiveTerminalCharged':
      return `objectiveTerminalCharged(id=${e.terminalId}, charge=${e.charge}/${e.required})`;
    case 'objectiveTerminalActivated':
      return `objectiveTerminalActivated(id=${e.terminalId})`;

    // ─────────────────────────────────
    // Level 04+: Laser Sweep
    // ─────────────────────────────────
    case 'laserWarningSet':
      return `laserWarningSet(${e.kind}, index=${e.index})`;
    case 'laserSweepStart':
      return `laserSweepStart(${e.kind}, index=${e.index})`;
    case 'laserSweepCleared':
      return `laserSweepCleared(indices=[${fmtList(e.indices)}])`;
    case 'laserSweepHazards':
      return `laserSweepHazards(contamination=[${fmtList(e.contaminationIndices)}], firewall=[${fmtList(e.firewallIndices)}])`;

    // ─────────────────────────────────
    // Pre-Falling Guardrails: Observability
    // ─────────────────────────────────
    case 'turnCommitArmed':
      if (e.kind === 'swap') {
        return `turnCommitArmed(swap, spendMove=${String(e.spendMove)}, from=${e.from}, to=${e.to})`;
      }
      return `turnCommitArmed(item, key=${e.key}, target=${e.target.x},${e.target.y}, reqId=${e.requestId})`;
    case 'turnEndStart':
      return `turnEndStart(${e.kind}, spendMove=${String(e.spendMove)})`;
    case 'turnEndComplete':
      return 'turnEndComplete()';
    case 'turnSeparator':
      return ''; // rendered as blank line, not text

    default: {
      const _exhaustive: never = e;
      return JSON.stringify(_exhaustive);
    }
  }
}

type Props = {
  events: EngineEvent[];

  // Cap for perf/readability. Set <= 0 to render all events.
  maxLines?: number;
};

const DEFAULT_MAX_LINES = 80;

export default function DebugEventLog({ events, maxLines = DEFAULT_MAX_LINES }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [campaign, setCampaign] = useState<CampaignDebugDetail | null>(null);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLLIElement | null>(null);

  const lastEventsChrono = useMemo(() => {
    if (!Number.isFinite(maxLines) || maxLines <= 0) return events;
    return events.slice(-maxLines);
  }, [events, maxLines]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [events.length]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onDbg = (e: Event) => {
      const ce = e as CustomEvent<CampaignDebugDetail>;
      setCampaign(ce.detail);
    };

    window.addEventListener(CAMPAIGN_DEBUG_EVENT, onDbg as EventListener);
    return () => window.removeEventListener(CAMPAIGN_DEBUG_EVENT, onDbg as EventListener);
  }, []);

  const scrollerMaxH = expanded ? 'max-h-[min(520px,calc(100svh-340px))]' : 'h-[460px]';

  return (
    <div className="w-full max-w-full rounded-2xl p-3 bg-black/30 border border-white/10 shadow-lg">
      <div className="flex items-center justify-between gap-2">
        <div className="text-white/90 font-semibold">Event log</div>

        <div className="flex items-center gap-3">
          <div className="text-white/50 text-xs">
            {lastEventsChrono.length} / {events.length}
          </div>

          <button
            type="button"
            className="text-white/70 text-xs px-2 py-1 rounded-lg border border-white/10 bg-black/20 hover:bg-black/35"
            onClick={() => setExpanded((v) => !v)}
            aria-pressed={expanded}
            title={expanded ? 'Collapse Event log' : 'Expand Event log'}
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      <div className="mt-2 rounded-xl bg-black/40 border border-white/10 p-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-white/80 text-xs font-semibold">Campaign debug</div>
          <div className="text-white/40 text-[11px] font-mono">{fmtSend(campaign?.lastSend)}</div>
        </div>

        <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          <div className="text-white/50">CAMPAIGN_ID</div>
          <div className="text-white/90 font-mono">{fmtIdShort(campaign?.campaignId)}</div>

          <div className="text-white/50">LEVEL / PHASE</div>
          <div className="text-white/90 font-mono">
            {campaign?.levelIndex ?? '-'} / {campaign?.phase ?? '-'}
          </div>

          <div className="text-white/50">ATTEMPT_ID</div>
          <div className="text-white/90 font-mono">{fmtIdShort(campaign?.attemptId)}</div>

          <div className="text-white/50">MOVES used</div>
          <div className="text-white/90 font-mono">{campaign?.movesUsedRaw ?? '-'}</div>

          <div className="text-white/50">SENT</div>
          <div className="text-white/90 font-mono">
            end={String(campaign?.sentLevelEnd ?? false)} abort={String(campaign?.sentLevelAbort ?? false)}
          </div>

          <div className="text-white/50">QUEUE</div>
          <div className="text-white/90 font-mono">{campaign?.queuedSends ?? 0}</div>
        </div>
      </div>

      <div ref={scrollerRef} className={`mt-2 ${scrollerMaxH} overflow-y-auto overscroll-contain`} style={{ scrollbarGutter: 'stable' }}>
        <ul className="space-y-0">
          {lastEventsChrono.map((e, i) => {
            // turnSeparator: render as engine-owned blank line (no inference)
            if (e.type === 'turnSeparator') {
              return (
                <li key={i} className="font-mono text-xs whitespace-pre text-white/0 select-none" aria-hidden="true">
                  {'\u00A0'}
                </li>
              );
            }

            const next = lastEventsChrono[i + 1];
            const isClear = e.type === 'selectionCleared';

            if (isClear) {
              const prev = lastEventsChrono[i - 1];
              const wasInlined = prev && prev.type !== 'selectionCleared';
              if (wasInlined) return null;

              return (
                <Fragment key={i}>
                  <li className="font-mono text-xs text-white/75 whitespace-pre">{formatEvent(e)}</li>
                  <li className="font-mono text-xs whitespace-pre text-white/0 select-none" aria-hidden="true">
                    {'\u00A0'}
                  </li>
                </Fragment>
              );
            }

            const shouldInlineClear = next?.type === 'selectionCleared';

            if (shouldInlineClear) {
              const arrow = '   ---->   ';
              return (
                <Fragment key={i}>
                  <li className="font-mono text-xs text-white/75 whitespace-pre">
                    {formatEvent(e)}
                    {arrow}
                    selectionCleared()
                  </li>
                  <li className="font-mono text-xs whitespace-pre text-white/0 select-none" aria-hidden="true">
                    {'\u00A0'}
                  </li>
                </Fragment>
              );
            }

            return (
              <li key={i} className="font-mono text-xs text-white/75 whitespace-pre">
                {formatEvent(e)}
              </li>
            );
          })}

          <li ref={bottomRef} className="h-px" aria-hidden="true" />
        </ul>
      </div>

      <div className="mt-3 text-xs text-white/50">Drag = swap on release Click = select Click adjacent = swap</div>
    </div>
  );
}
