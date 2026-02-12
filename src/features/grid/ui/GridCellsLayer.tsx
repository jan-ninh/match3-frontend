// src/features/grid/ui/GridCellsLayer.tsx
import type { Cell } from '@/gamelogic';
import { xyOf } from '@/gamelogic';
import { GAP, TILE_SIZE } from '../lib/constants';
import { getGateSprite, getSpecialTileSprite, specialSpike, specialTile_04 } from './tiles-special';

type Props = {
  width: number;
  height: number;
  cells: Cell[];
  onCellPointerDown: (index: number, e: React.PointerEvent<HTMLButtonElement>) => void;
  showDebugLabels?: boolean;
};

export default function GridCellsLayer({ width, height, cells, onCellPointerDown, showDebugLabels = false }: Props) {
  const spriteToBgStyle = (sprite: ReturnType<typeof getSpecialTileSprite>): React.CSSProperties | undefined => {
    if (!sprite) return undefined;

    const scale = TILE_SIZE / sprite.w;
    return {
      backgroundImage: `url(${sprite.sheet})`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: `${sprite.sheetW * scale}px ${sprite.sheetH * scale}px`,
      backgroundPosition: `${-sprite.x * scale}px ${-sprite.y * scale}px`,
    };
  };

  // blocked cells use piece_04.png (special tileset basic b-04)
  const blockedSpriteStyleBase = spriteToBgStyle(getSpecialTileSprite(specialTile_04));

  // CLEAN ROOM spike sprite (specials.spike -> b-11 -> piece_11.png)
  const spikeSpriteStyleBase = spriteToBgStyle(getSpecialTileSprite(specialSpike));

  // Level 02: Leak sprites
  const leakOpenSpriteStyle = spriteToBgStyle(getSpecialTileSprite('leakOpen'));
  const leakSealedSpriteStyle = spriteToBgStyle(getSpecialTileSprite('leakSealed'));

  // Level 02: Contamination sprite
  const contaminationSpriteStyle = spriteToBgStyle(getSpecialTileSprite('contamination'));

  // Level 02: SealKit sprite
  const sealKitSpriteStyle = spriteToBgStyle(getSpecialTileSprite('sealKit'));

  return (
    <div
      className="grid"
      style={{
        gap: `${GAP}px`,
        gridTemplateColumns: `repeat(${width}, ${TILE_SIZE}px)`,
        gridTemplateRows: `repeat(${height}, ${TILE_SIZE}px)`,
      }}
    >
      {cells.map((cell, index) => {
        const obs = cell.obstacle;

        const isGate = obs?.kind === 'gate';
        const isFirewall = obs?.kind === 'firewall';
        const isLeak = obs?.kind === 'leak';
        const isContamination = obs?.kind === 'contamination';
        const isSealKit = obs?.kind === 'sealKit';

        // Level 03: Terminal
        const isTerminal = obs?.kind === 'terminal';
        const terminalState = isTerminal ? obs.state : null;
        const terminalCharge = isTerminal ? obs.charge : 0;
        const terminalRequired = isTerminal ? obs.requiredCharge : 0;
        const terminalColor = isTerminal ? obs.chargeColor : null;

        // Level 04: Objective Terminal
        const isObjectiveTerminal = obs?.kind === 'objectiveTerminal';
        const objTerminalState = isObjectiveTerminal ? obs.state : null;
        const objTerminalCharge = isObjectiveTerminal ? obs.charge : 0;
        const objTerminalRequired = isObjectiveTerminal ? obs.requiredCharge : 0;

        // CLEAN ROOM "spikes" are implemented via firewallNodes with hp=1
        const isSpike = isFirewall && obs.maxHp === 1;
        const isFirewallNode = isFirewall && !isSpike;

        const isBlockedPlain = cell.blocked && !isGate && !isFirewall && !isLeak && !isContamination && !isSealKit && !isTerminal && !isObjectiveTerminal;

        const { x, y } = xyOf(index, width);

        const gateSprite = isGate ? getGateSprite(obs.open) : null;
        const gateSpriteStyle = spriteToBgStyle(gateSprite);

        // Leak sealed state
        const leakSealed = isLeak && obs.progress >= obs.required;

        const base = [
          'relative rounded-xl border border-slate-500/5 bg-transparent focus:outline-none',
          cell.blocked ? 'cursor-not-allowed' : 'cursor-pointer shadow-sm',
        ].join(' ');

        return (
          <button
            key={index}
            type="button"
            className={base}
            style={{
              width: TILE_SIZE,
              height: TILE_SIZE,
            }}
            disabled={cell.blocked}
            aria-label={cell.blocked ? `blocked cell ${index}` : `cell ${index}`}
            onPointerDown={(e) => onCellPointerDown(index, e)}
          >
            {showDebugLabels ? (
              <div className="absolute top-1 left-1 text-[10px] leading-none text-white/80 drop-shadow">
                {x},{y}
              </div>
            ) : null}

            {/* Gate */}
            {isGate ? (
              <>
                <div className="absolute inset-0 rounded-xl opacity-90" style={gateSpriteStyle} />
                <div
                  className={[
                    'absolute inset-2 rounded-lg border border-white/10',
                    obs.open ? 'bg-emerald-500/10 shadow-[0_0_18px_rgba(16,185,129,0.18)]' : 'bg-fuchsia-500/10 shadow-[0_0_18px_rgba(217,70,239,0.18)]',
                  ].join(' ')}
                />
              </>
            ) : null}

            {/* Spike (Level 01) */}
            {isSpike ? (
              <>
                <div className="absolute inset-0 rounded-xl" />
                <div className="absolute inset-2 rounded-lg" />

                {spikeSpriteStyleBase ? (
                  <div className="absolute inset-0 rounded-xl opacity-95" style={spikeSpriteStyleBase} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-6 w-6 rotate-45 rounded-[6px] bg-white/5 border border-white/15 shadow-[0_0_14px_rgba(255,255,255,0.10)]" />
                  </div>
                )}
              </>
            ) : null}

            {/* Firewall Node (Level 01, HP > 1) */}
            {isFirewallNode ? (
              <>
                <div className="absolute inset-0 rounded-xl bg-slate-950/70" />
                <div className="absolute inset-0 rounded-xl border border-cyan-300/20 shadow-[0_0_18px_rgba(34,211,238,0.18)]" />
                <div className="absolute inset-2 rounded-lg bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.18)]" />

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-5 w-5 rounded-full bg-cyan-300/20 border border-cyan-200/20 shadow-[0_0_14px_rgba(34,211,238,0.25)]" />
                </div>

                <div className="absolute bottom-1 left-1 right-1 flex justify-center gap-1">
                  {Array.from({ length: Math.min(3, obs.maxHp) }, (_, i) => {
                    const on = i < obs.hp;
                    return (
                      <div
                        key={i}
                        className={[
                          'h-1.5 w-4 rounded-full border',
                          on ? 'bg-cyan-400/55 border-cyan-200/35 shadow-[0_0_10px_rgba(34,211,238,0.18)]' : 'bg-white/5 border-white/15',
                        ].join(' ')}
                      />
                    );
                  })}
                </div>
              </>
            ) : null}

            {/* Leak (Level 02) */}
            {isLeak ? (
              <>
                <div className="absolute inset-0 rounded-xl bg-slate-950/70" />
                <div
                  className={[
                    'absolute inset-0 rounded-xl border',
                    leakSealed
                      ? 'border-emerald-300/25 shadow-[0_0_18px_rgba(16,185,129,0.20)]'
                      : 'border-amber-400/30 shadow-[0_0_18px_rgba(251,191,36,0.25)] animate-pulse',
                  ].join(' ')}
                />

                {/* Sprite or fallback */}
                {leakSealed && leakSealedSpriteStyle ? (
                  <div className="absolute inset-0 rounded-xl opacity-95" style={leakSealedSpriteStyle} />
                ) : !leakSealed && leakOpenSpriteStyle ? (
                  <div className="absolute inset-0 rounded-xl opacity-95" style={leakOpenSpriteStyle} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className={[
                        'h-6 w-6 rounded-full border-2',
                        leakSealed ? 'bg-emerald-500/30 border-emerald-300/40' : 'bg-amber-500/30 border-amber-300/50',
                      ].join(' ')}
                    >
                      {leakSealed ? (
                        <div className="w-full h-full flex items-center justify-center text-emerald-200 text-xs">✓</div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-amber-200 text-xs">!</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Patch progress indicator */}
                <div className="absolute bottom-1 left-1 right-1 flex justify-center gap-1">
                  {Array.from({ length: obs.required }, (_, i) => {
                    const filled = i < obs.progress;
                    return (
                      <div
                        key={i}
                        className={[
                          'h-1.5 w-4 rounded-full border',
                          filled ? 'bg-emerald-400/55 border-emerald-200/35 shadow-[0_0_10px_rgba(16,185,129,0.20)]' : 'bg-white/5 border-white/15',
                        ].join(' ')}
                      />
                    );
                  })}
                </div>
              </>
            ) : null}

            {/* Contamination (Level 02) */}
            {isContamination ? (
              <>
                <div className="absolute inset-0 rounded-xl bg-slate-950/60" />
                <div className="absolute inset-0 rounded-xl border border-rose-400/30 shadow-[0_0_16px_rgba(251,113,133,0.22)]" />

                {contaminationSpriteStyle ? (
                  <div className="absolute inset-0 rounded-xl opacity-90" style={contaminationSpriteStyle} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-5 w-5 rounded-full bg-rose-500/40 border border-rose-300/40 shadow-[0_0_12px_rgba(251,113,133,0.30)]">
                      <div className="w-full h-full flex items-center justify-center text-rose-200 text-[10px]">☣</div>
                    </div>
                  </div>
                )}
              </>
            ) : null}

            {/* SealKit (Level 02) */}
            {isSealKit ? (
              <>
                <div className="absolute inset-0 rounded-xl bg-slate-950/50" />
                <div className="absolute inset-0 rounded-xl border border-sky-400/35 shadow-[0_0_18px_rgba(56,189,248,0.25)]" />

                {sealKitSpriteStyle ? (
                  <div className="absolute inset-0 rounded-xl opacity-95" style={sealKitSpriteStyle} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-6 w-6 rounded-lg bg-sky-500/30 border border-sky-300/40 shadow-[0_0_14px_rgba(56,189,248,0.28)]">
                      <div className="w-full h-full flex items-center justify-center text-sky-200 text-xs">🔧</div>
                    </div>
                  </div>
                )}
              </>
            ) : null}

            {/* Terminal (Level 03) */}
            {isTerminal ? (
              <>
                <div className="absolute inset-0 rounded-xl bg-slate-950/70" />
                <div
                  className={[
                    'absolute inset-0 rounded-xl border-2',
                    terminalState === 'verified'
                      ? 'border-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.35)]'
                      : terminalState === 'open'
                        ? 'border-sky-400/50 shadow-[0_0_20px_rgba(56,189,248,0.30)] animate-pulse'
                        : 'border-slate-500/40 shadow-[0_0_12px_rgba(100,116,139,0.20)]',
                  ].join(' ')}
                />

                {/* Terminal icon/indicator */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className={[
                      'h-8 w-8 rounded-lg border-2 flex items-center justify-center',
                      terminalState === 'verified'
                        ? 'bg-emerald-500/30 border-emerald-300/50'
                        : terminalState === 'open'
                          ? 'bg-sky-500/30 border-sky-300/50'
                          : 'bg-slate-600/30 border-slate-400/40',
                    ].join(' ')}
                  >
                    {terminalState === 'verified' ? (
                      <span className="text-emerald-200 text-sm">✓</span>
                    ) : terminalState === 'open' ? (
                      <span className="text-sky-200 text-xs">⎆</span>
                    ) : (
                      <span className="text-slate-300 text-xs">🔒</span>
                    )}
                  </div>
                </div>

                {/* Charge indicator */}
                {terminalState !== 'verified' && terminalRequired > 0 ? (
                  <div className="absolute bottom-1 left-1 right-1 flex justify-center gap-1">
                    {Array.from({ length: terminalRequired }, (_, i) => {
                      const filled = i < terminalCharge;
                      const colorClass =
                        terminalColor === 'blue'
                          ? filled
                            ? 'bg-blue-400/60 border-blue-300/50'
                            : 'bg-white/5 border-white/15'
                          : terminalColor === 'green'
                            ? filled
                              ? 'bg-green-400/60 border-green-300/50'
                              : 'bg-white/5 border-white/15'
                            : filled
                              ? 'bg-purple-400/60 border-purple-300/50'
                              : 'bg-white/5 border-white/15';
                      return <div key={i} className={['h-1.5 w-4 rounded-full border', colorClass].join(' ')} />;
                    })}
                  </div>
                ) : null}

                {/* ChargeColor indicator label */}
                {terminalState === 'locked' && terminalColor ? (
                  <div className="absolute top-1 left-1 right-1 flex justify-center">
                    <span
                      className={[
                        'text-[8px] uppercase tracking-wider px-1 rounded',
                        terminalColor === 'blue'
                          ? 'text-blue-300/80 bg-blue-500/10'
                          : terminalColor === 'green'
                            ? 'text-green-300/80 bg-green-500/10'
                            : 'text-purple-300/80 bg-purple-500/10',
                      ].join(' ')}
                    >
                      {terminalColor}
                    </span>
                  </div>
                ) : null}
              </>
            ) : null}

            {/* Objective Terminal (Level 04 Boss) */}
            {isObjectiveTerminal ? (
              <>
                <div className="absolute inset-0 rounded-xl bg-slate-950/80" />
                <div
                  className={[
                    'absolute inset-0 rounded-xl border-2',
                    objTerminalState === 'active'
                      ? 'border-emerald-400/60 shadow-[0_0_24px_rgba(16,185,129,0.45)]'
                      : 'border-amber-500/50 shadow-[0_0_18px_rgba(245,158,11,0.30)]',
                  ].join(' ')}
                />

                {/* Pulsing glow for inactive */}
                {objTerminalState === 'inactive' && (
                  <div
                    className="absolute inset-0 rounded-xl animate-pulse"
                    style={{
                      background: 'radial-gradient(circle at center, rgba(245,158,11,0.15) 0%, transparent 70%)',
                    }}
                  />
                )}

                {/* Terminal icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className={[
                      'h-10 w-10 rounded-lg border-2 flex items-center justify-center',
                      objTerminalState === 'active' ? 'bg-emerald-500/40 border-emerald-300/60' : 'bg-amber-500/25 border-amber-400/50',
                    ].join(' ')}
                  >
                    {objTerminalState === 'active' ? <span className="text-emerald-200 text-lg">✓</span> : <span className="text-amber-200 text-sm">⎆</span>}
                  </div>
                </div>

                {/* Charge progress bar */}
                {objTerminalState === 'inactive' && objTerminalRequired > 0 ? (
                  <div className="absolute bottom-1.5 left-1.5 right-1.5 flex justify-center gap-1">
                    {Array.from({ length: objTerminalRequired }, (_, i) => {
                      const filled = i < objTerminalCharge;
                      return (
                        <div
                          key={i}
                          className={[
                            'h-2 flex-1 rounded-full border',
                            filled ? 'bg-amber-400/70 border-amber-300/60 shadow-[0_0_8px_rgba(245,158,11,0.35)]' : 'bg-white/10 border-white/20',
                          ].join(' ')}
                        />
                      );
                    })}
                  </div>
                ) : null}

                {/* "TERMINAL" label */}
                <div className="absolute top-1 left-1 right-1 flex justify-center">
                  <span
                    className={[
                      'text-[7px] uppercase tracking-widest px-1.5 py-0.5 rounded font-bold',
                      objTerminalState === 'active' ? 'text-emerald-200/90 bg-emerald-500/20' : 'text-amber-200/80 bg-amber-500/15',
                    ].join(' ')}
                  >
                    {objTerminalState === 'active' ? 'ACTIVE' : 'TERMINAL'}
                  </span>
                </div>
              </>
            ) : null}

            {/* Plain blocked cell */}
            {isBlockedPlain && blockedSpriteStyleBase ? <div className="absolute inset-0 rounded-xl opacity-95" style={blockedSpriteStyleBase} /> : null}
          </button>
        );
      })}
    </div>
  );
}
