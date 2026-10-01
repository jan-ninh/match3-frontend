type Props = {
  stage: 'intact' | 'cracked' | 'fractured';
};

/**
 * “Sturdy” look, no HP numbers.
 * We only show qualitative damage via 3 stages.
 */
export function StoneTileOverlay({ stage }: Props) {
  const crackOpacity = stage === 'intact' ? 'opacity-0' : stage === 'cracked' ? 'opacity-60' : 'opacity-90';
  const chipOpacity = stage === 'fractured' ? 'opacity-100' : 'opacity-0';

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* base slab */}
      <div
        className={[
          'absolute inset-[6%] rounded-xl',
          'bg-[linear-gradient(145deg,rgba(255,255,255,0.10),rgba(0,0,0,0.65))]',
          'border border-white/10',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.10),inset_0_-10px_18px_rgba(0,0,0,0.55),0_10px_18px_rgba(0,0,0,0.35)]',
        ].join(' ')}
      />

      {/* bevel rim */}
      <div
        className={[
          'absolute inset-[6%] rounded-xl',
          'shadow-[inset_0_0_0_1px_rgba(0,0,0,0.65),inset_0_0_0_2px_rgba(255,255,255,0.06)]',
        ].join(' ')}
      />

      {/* cracks */}
      <div
        className={[
          'absolute inset-[10%] rounded-lg',
          crackOpacity,
          'bg-[radial-gradient(circle_at_30%_35%,rgba(255,255,255,0.22),transparent_42%),radial-gradient(circle_at_70%_65%,rgba(255,255,255,0.18),transparent_45%)]',
          'mix-blend-screen',
        ].join(' ')}
      />

      {/* chips (fractured) */}
      <div
        className={[
          'absolute inset-[6%] rounded-xl',
          chipOpacity,
          'bg-[conic-gradient(from_0deg,rgba(255,255,255,0.00),rgba(255,255,255,0.14),rgba(255,255,255,0.00))]',
        ].join(' ')}
      />
      <div className={['absolute inset-[6%] rounded-xl', chipOpacity, 'shadow-[0_0_0_1px_rgba(255,255,255,0.10)]'].join(' ')} />
    </div>
  );
}
