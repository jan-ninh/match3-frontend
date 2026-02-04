type Props = {
  active: boolean;
  show: boolean;
};

export default function GridLockoutOverlay({ active, show }: Props) {
  if (!active || !show) return null;

  return (
    <>
      <div className="absolute inset-0 rounded-2xl bg-black/20 pointer-events-none" style={{ zIndex: 90 }} />
      <div
        className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/40 border border-white/10 text-[11px] text-white/70 pointer-events-none"
        style={{ zIndex: 91 }}
      >
        animated
      </div>
    </>
  );
}
