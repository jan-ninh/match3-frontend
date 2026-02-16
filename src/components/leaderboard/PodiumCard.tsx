import { AvatarSprite } from '@/components';
import type { User } from '@/types';

type Props = {
  user: User;
  position: number;
};

export default function PodiumCard({ user, position }: Props) {
  const height = position === 1 ? 'h-48' : position === 2 ? 'h-40' : 'h-39';
  // Neon theme per position
  const neon =
    position === 1
      ? {
          ring: 'ring-fuchsia-400/35 border-fuchsia-300',
          glow: 'shadow-[0_0_22px_rgba(236,72,153,0.22),0_0_34px_rgba(251,146,60,0.12)]',
          blob: 'bg-[radial-gradient(circle_at_30%_15%,rgba(236,72,153,0.28),transparent_60%),radial-gradient(circle_at_80%_80%,rgba(251,146,60,0.18),transparent_60%)]',
          badge: 'text-fuchsia-100 bg-fuchsia-500/15 border-fuchsia-300/20',
        }
      : position === 2
        ? {
            ring: 'ring-cyan-400/30 border-cyan-200',
            glow: 'shadow-[0_0_20px_rgba(34,211,238,0.20),0_0_30px_rgba(34,211,238,0.10)]',
            blob: 'bg-[radial-gradient(circle_at_30%_15%,rgba(34,211,238,0.26),transparent_60%),radial-gradient(circle_at_80%_80%,rgba(99,102,241,0.14),transparent_60%)]',
            badge: 'text-cyan-100 bg-cyan-500/12 border-cyan-200/20',
          }
        : {
            ring: 'ring-orange-400/30 border-orange-200',
            glow: 'shadow-[0_0_20px_rgba(251,146,60,0.18),0_0_30px_rgba(251,146,60,0.10)]',
            blob: 'bg-[radial-gradient(circle_at_30%_15%,rgba(251,146,60,0.22),transparent_60%),radial-gradient(circle_at_80%_80%,rgba(168,85,247,0.14),transparent_60%)]',
            badge: 'text-orange-100 bg-orange-500/12 border-orange-200/20',
          };

  return (
    <div
      className={[
        'relative flex flex-col items-center rounded-2xl w-24 mx-2 overflow-hidden',
        height,
        // cyber glass base
        'bg-slate-950/22 backdrop-blur-md',
        'border ring-1',
        neon.ring,
        neon.glow,
      ].join(' ')}
    >
      {/* neon blobs */}
      <div className={['pointer-events-none absolute inset-0 opacity-70', neon.blob].join(' ')} />

      {/* subtle scanlines */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-size-[100%_10px]" />

      {/* Top triangle badge */}
      <div
        className={['relative w-full h-12 flex items-center justify-center font-extrabold', 'border-b', neon.badge].join(' ')}
        style={{ clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)' }}
      >
        {position}
      </div>

      <div className="relative flex-1 flex flex-col justify-end items-center p-2 text-white/85">
        <AvatarSprite name={(user.avatar as any) || 'default.png'} size={64} />
        <span className="mt-1 font-semibold text-[13px] truncate max-w-22">{user.name}</span>
        <span className="text-xs text-white/70">{user.score} pts</span>
      </div>
    </div>
  );
}
