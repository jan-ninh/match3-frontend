// src/features/grid/ui/cells/renderers/SignalTargetOverlay.tsx
/**
 * Level 05: Signal Target (relay node) overlay
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
          background: 'radial-gradient(circle, rgba(168,85,247,0.25) 0%, rgba(168,85,247,0.08) 60%, transparent 100%)',
          boxShadow: '0 0 20px rgba(168,85,247,0.3), inset 0 0 12px rgba(168,85,247,0.15)',
          animationDuration: '1.5s',
        }}
      />

      {/* Inner icon area */}
      <div
        className="relative w-10 h-10 rounded-lg flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, rgba(168,85,247,0.4) 0%, rgba(139,92,246,0.5) 100%)',
          border: '2px solid rgba(168,85,247,0.6)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4), 0 0 8px rgba(168,85,247,0.3)',
        }}
      >
        {/* "T" for Target or receiver icon */}
        <span className="text-purple-200 text-lg font-bold drop-shadow-md">T</span>
      </div>

      {/* Seeking animation (inward pulse) */}
      <div
        className="absolute inset-2 rounded-lg animate-pulse opacity-30"
        style={{
          border: '2px dashed rgba(168,85,247,0.5)',
          animationDuration: '1.8s',
        }}
      />
    </div>
  );
}
