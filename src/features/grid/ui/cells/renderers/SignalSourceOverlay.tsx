// src/features/grid/ui/cells/renderers/SignalSourceOverlay.tsx
/**
 * Signal Source (Point A) overlay
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
          background: 'radial-gradient(circle, rgba(140,255,90,0.25) 0%, rgba(20,255,120,0.08) 60%, transparent 100%)',
          boxShadow: '0 0 22px rgba(140,255,90,0.28), inset 0 0 14px rgba(20,255,120,0.14)',
        }}
      />

      {/* Inner icon area */}
      <div
        className="relative w-10 h-10 rounded-lg flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, rgba(140,255,90,0.38) 0%, rgba(20,255,120,0.46) 100%)',
          border: '2px solid rgba(140,255,90,0.55)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.42), 0 0 10px rgba(140,255,90,0.24)',
        }}
      >
        <span className="text-emerald-100 text-lg font-bold drop-shadow-md">A</span>
      </div>

      {/* Pulsing broadcast ring */}
      <div
        className="absolute inset-0 rounded-lg animate-ping opacity-20"
        style={{
          border: '1px solid rgba(140,255,90,0.5)',
          animationDuration: '2.1s',
        }}
      />
    </div>
  );
}
