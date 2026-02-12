// src/features/grid/ui/cells/renderers/ChargedCellOverlay.tsx
/**
 * Level 05: Charged Cell (conductive floor) overlay
 *
 * This is a floor overlay - pieces can exist on top of it.
 * Visual: subtle conductive pattern / circuit trace look.
 */

export function ChargedCellOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Base conductive glow */}
      <div
        className="absolute inset-0 rounded-lg"
        style={{
          background: 'linear-gradient(135deg, rgba(6,182,212,0.12) 0%, rgba(34,211,238,0.08) 50%, rgba(6,182,212,0.12) 100%)',
          boxShadow: 'inset 0 0 8px rgba(6,182,212,0.2)',
        }}
      />

      {/* Circuit trace pattern (subtle lines) */}
      <div
        className="absolute inset-0 rounded-lg opacity-40"
        style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px),
            linear-gradient(0deg, rgba(34,211,238,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '8px 8px',
          backgroundPosition: 'center center',
        }}
      />

      {/* Center dot (node indicator) */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-2 h-2 rounded-full"
          style={{
            background: 'rgba(34,211,238,0.6)',
            boxShadow: '0 0 6px rgba(34,211,238,0.8), 0 0 12px rgba(34,211,238,0.4)',
          }}
        />
      </div>

      {/* Corner accents */}
      <div className="absolute top-1 left-1 w-2 h-2 border-l border-t border-cyan-400/40 rounded-tl" />
      <div className="absolute top-1 right-1 w-2 h-2 border-r border-t border-cyan-400/40 rounded-tr" />
      <div className="absolute bottom-1 left-1 w-2 h-2 border-l border-b border-cyan-400/40 rounded-bl" />
      <div className="absolute bottom-1 right-1 w-2 h-2 border-r border-b border-cyan-400/40 rounded-br" />
    </div>
  );
}
