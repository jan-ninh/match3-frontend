/**
 * Enemy Red Cell overlay
 *
 * Visual-only floor mark: painted red when the enemy clears a slot.
 * Pieces can exist on top of it.
 */

export function EnemyRedCellOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
      {/* Base glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 35% 35%, rgba(255, 80, 80, 0.22) 0%, rgba(255, 30, 30, 0.10) 55%, rgba(0,0,0,0) 100%)',
          boxShadow: 'inset 0 0 10px rgba(255, 60, 60, 0.18)',
          mixBlendMode: 'screen',
        }}
      />

      {/* Flow layer 1 */}
      <div
        className="absolute -inset-3 animate-spin opacity-70"
        style={{
          background:
            'conic-gradient(from 180deg, rgba(255,80,80,0.00), rgba(255,80,80,0.16), rgba(255,80,80,0.02), rgba(255,60,60,0.10), rgba(255,80,80,0.00))',
          filter: 'blur(3px)',
          animationDuration: '6.5s',
          mixBlendMode: 'screen',
        }}
      />

      {/* Flow layer 2 */}
      <div
        className="absolute -inset-4 animate-spin opacity-45"
        style={{
          background:
            'conic-gradient(from 45deg, rgba(255,30,30,0.00), rgba(255,30,30,0.14), rgba(255,30,30,0.02), rgba(255,20,20,0.08), rgba(255,30,30,0.00))',
          filter: 'blur(5px)',
          animationDuration: '11s',
          animationDirection: 'reverse',
          mixBlendMode: 'screen',
        }}
      />

      {/* Subtle scanlines */}
      <div
        className="absolute inset-0 opacity-30 animate-pulse"
        style={{
          backgroundImage: `
            repeating-linear-gradient(135deg, rgba(255,80,80,0.16) 0px, rgba(255,80,80,0.16) 1px, transparent 1px, transparent 7px),
            repeating-linear-gradient(45deg, rgba(255,30,30,0.10) 0px, rgba(255,30,30,0.10) 1px, transparent 1px, transparent 9px)
          `,
          backgroundSize: '12px 12px',
          backgroundPosition: 'center center',
          mixBlendMode: 'screen',
        }}
      />

      {/* Center node */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-2 h-2 rounded-full"
          style={{
            background: 'rgba(255, 150, 150, 0.65)',
            boxShadow: '0 0 6px rgba(255,80,80,0.9), 0 0 14px rgba(255,30,30,0.4)',
          }}
        />
      </div>

      {/* Corner accents */}
      <div className="absolute top-1 left-1 w-2 h-2 border-l border-t rounded-tl" style={{ borderColor: 'rgba(255,80,80,0.40)' }} />
      <div className="absolute top-1 right-1 w-2 h-2 border-r border-t rounded-tr" style={{ borderColor: 'rgba(255,80,80,0.40)' }} />
      <div className="absolute bottom-1 left-1 w-2 h-2 border-l border-b rounded-bl" style={{ borderColor: 'rgba(255,80,80,0.40)' }} />
      <div className="absolute bottom-1 right-1 w-2 h-2 border-r border-b rounded-br" style={{ borderColor: 'rgba(255,80,80,0.40)' }} />
    </div>
  );
}
