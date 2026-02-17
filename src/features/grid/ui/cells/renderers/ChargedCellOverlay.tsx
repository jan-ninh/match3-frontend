// src/features/grid/ui/cells/renderers/ChargedCellOverlay.tsx
/**
 * Charged Cell (conductive floor) overlay
 *
 * This is a floor overlay - pieces can exist on top of it.
 * Visual: "Tiberian Sun" style toxic green flow (animated), transparent.
 */

export function ChargedCellOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
      {/* Base toxic glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 30% 30%, rgba(140, 255, 90, 0.26) 0%, rgba(20, 255, 120, 0.12) 55%, rgba(0,0,0,0) 100%)',
          boxShadow: 'inset 0 0 10px rgba(80, 255, 120, 0.22)',
          mixBlendMode: 'screen',
        }}
      />

      {/* Flow layer 1 (slow spin) */}
      <div
        className="absolute -inset-3 animate-spin opacity-70"
        style={{
          background:
            'conic-gradient(from 180deg, rgba(140,255,90,0.00), rgba(140,255,90,0.18), rgba(140,255,90,0.02), rgba(140,255,90,0.12), rgba(140,255,90,0.00))',
          filter: 'blur(3px)',
          animationDuration: '6.5s',
          mixBlendMode: 'screen',
        }}
      />

      {/* Flow layer 2 (counter spin) */}
      <div
        className="absolute -inset-4 animate-spin opacity-45"
        style={{
          background:
            'conic-gradient(from 45deg, rgba(20,255,120,0.00), rgba(20,255,120,0.16), rgba(20,255,120,0.02), rgba(20,255,120,0.10), rgba(20,255,120,0.00))',
          filter: 'blur(5px)',
          animationDuration: '11s',
          animationDirection: 'reverse',
          mixBlendMode: 'screen',
        }}
      />

      {/* Subtle scanlines / ripples */}
      <div
        className="absolute inset-0 opacity-35 animate-pulse"
        style={{
          backgroundImage: `
            repeating-linear-gradient(135deg, rgba(140,255,90,0.18) 0px, rgba(140,255,90,0.18) 1px, transparent 1px, transparent 7px),
            repeating-linear-gradient(45deg, rgba(20,255,120,0.10) 0px, rgba(20,255,120,0.10) 1px, transparent 1px, transparent 9px)
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
            background: 'rgba(170, 255, 130, 0.7)',
            boxShadow: '0 0 6px rgba(140,255,90,0.9), 0 0 14px rgba(20,255,120,0.45)',
          }}
        />
      </div>

      {/* Corner accents */}
      <div className="absolute top-1 left-1 w-2 h-2 border-l border-t rounded-tl" style={{ borderColor: 'rgba(140,255,90,0.45)' }} />
      <div className="absolute top-1 right-1 w-2 h-2 border-r border-t rounded-tr" style={{ borderColor: 'rgba(140,255,90,0.45)' }} />
      <div className="absolute bottom-1 left-1 w-2 h-2 border-l border-b rounded-bl" style={{ borderColor: 'rgba(140,255,90,0.45)' }} />
      <div className="absolute bottom-1 right-1 w-2 h-2 border-r border-b rounded-br" style={{ borderColor: 'rgba(140,255,90,0.45)' }} />
    </div>
  );
}
