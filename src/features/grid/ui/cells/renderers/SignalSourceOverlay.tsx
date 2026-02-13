// src/features/grid/ui/cells/renderers/SignalSourceOverlay.tsx
/**
 * Level 05: Signal Source (uplink node) overlay
 */

type Props = {
  id: number;
};

export function SignalSourceOverlay({ id }: Props) {
  void id;

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* Outer glow ring */}
      <div
        className="absolute inset-1 rounded-lg animate-pulse"
        style={{
          background: 'radial-gradient(circle, rgba(34,197,94,0.25) 0%, rgba(34,197,94,0.08) 60%, transparent 100%)',
          boxShadow: '0 0 20px rgba(34,197,94,0.3), inset 0 0 12px rgba(34,197,94,0.15)',
        }}
      />

      {/* Inner icon area */}
      <div
        className="relative w-10 h-10 rounded-lg flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, rgba(34,197,94,0.4) 0%, rgba(22,163,74,0.5) 100%)',
          border: '2px solid rgba(34,197,94,0.6)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4), 0 0 8px rgba(34,197,94,0.3)',
        }}
      >
        {/* "S" for Source or uplink icon */}
        <span className="text-emerald-200 text-lg font-bold drop-shadow-md">S</span>
      </div>

      {/* Pulsing broadcast rings */}
      <div
        className="absolute inset-0 rounded-lg animate-ping opacity-20"
        style={{
          border: '1px solid rgba(34,197,94,0.5)',
          animationDuration: '2s',
        }}
      />
    </div>
  );
}
