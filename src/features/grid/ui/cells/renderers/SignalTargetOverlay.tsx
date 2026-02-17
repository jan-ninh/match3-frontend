// src/features/grid/ui/cells/renderers/SignalTargetOverlay.tsx
/**
 * Signal Target (Point B) overlay
 */

type Props = {
  id: number;
};

export function SignalTargetOverlay({ id }: Props) {
  void id;

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* Outer glow ring */}
      <div
        className="absolute inset-1 rounded-lg animate-pulse"
        style={{
          background: 'radial-gradient(circle, rgba(140,255,90,0.22) 0%, rgba(20,255,120,0.07) 60%, transparent 100%)',
          boxShadow: '0 0 22px rgba(140,255,90,0.26), inset 0 0 14px rgba(20,255,120,0.12)',
          animationDuration: '1.6s',
        }}
      />

      {/* Inner icon area */}
      <div
        className="relative w-10 h-10 rounded-lg flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, rgba(140,255,90,0.34) 0%, rgba(20,255,120,0.44) 100%)',
          border: '2px solid rgba(140,255,90,0.55)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.42), 0 0 10px rgba(140,255,90,0.22)',
        }}
      >
        <span className="text-emerald-100 text-lg font-bold drop-shadow-md">B</span>
      </div>

      {/* Seeking animation (inward pulse) */}
      <div
        className="absolute inset-2 rounded-lg animate-pulse opacity-30"
        style={{
          border: '2px dashed rgba(140,255,90,0.45)',
          animationDuration: '1.9s',
        }}
      />
    </div>
  );
}
