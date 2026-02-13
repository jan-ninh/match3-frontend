// src/features/grid/ui/cells/renderers/SweepFirewallOverlay.tsx
export function SweepFirewallOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0">
      {/* soft fill */}
      <div className="absolute inset-0 rounded-2xl bg-red-500/5" />

      {/* outer frame + glow */}
      <div className="absolute inset-[10%] rounded-xl border border-red-500/70 shadow-[0_0_18px_rgba(255,0,0,0.55)]" />
      <div className="absolute inset-[14%] rounded-lg border border-red-400/25 shadow-[0_0_28px_rgba(255,0,0,0.35)]" />

      {/* "scanner crosshair" vibe */}
      <div className="absolute left-1/2 top-[14%] h-[72%] w-px -translate-x-1/2 bg-red-400/35 shadow-[0_0_12px_rgba(255,0,0,0.55)]" />
      <div className="absolute top-1/2 left-[14%] h-px w-[72%] -translate-y-1/2 bg-red-400/35 shadow-[0_0_12px_rgba(255,0,0,0.55)]" />
    </div>
  );
}
