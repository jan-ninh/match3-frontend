import type { SyntheticEvent } from 'react';

export type AvatarProps = {
  src?: string;
  size?: number;
};

export default function Avatar({ src, size = 40 }: AvatarProps) {
  const finalSrc = src || '/avatar/default.png';

  const handleError = (e: SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = '/avatar/default.png';
  };

  const ring = Math.max(2, Math.round(size * 0.06)); // thickness scales with size

  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full p-0.5 bg-linear-to-br from-cyan-400 via-fuchsia-500 to-emerald-400 shadow-[0_0_18px_rgba(34,211,238,0.25),0_0_26px_rgba(236,72,153,0.18)]"
    >
      <div style={{ padding: ring }} className="w-full h-full rounded-full bg-slate-950/70 backdrop-blur-sm border border-white/10">
        <div className="w-full h-full rounded-full overflow-hidden bg-slate-900/40 flex items-center justify-center">
          <img src={finalSrc} alt="avatar" loading="lazy" draggable={false} className="w-full h-full object-cover" onError={handleError} />
        </div>
      </div>
    </div>
  );
}
