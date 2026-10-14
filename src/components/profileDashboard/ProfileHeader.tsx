import type { ReactNode } from 'react';
import GlassSection from '../GlassSection';
import { DASHBOARD_STYLE as S } from './theme';

type Props = {
  username: string;
  level: number;
  expCurrent: number;
  expRequired: number;
  progressPercent: number;
  avatar: ReactNode;
  onAvatarClick: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
};

export default function ProfileHeader({
  username,
  level,
  expCurrent,
  expRequired,
  progressPercent,
  avatar,
  onAvatarClick,
  onRefresh,
  refreshing = false,
}: Props) {
  const safeLevel = Number.isFinite(level) && level > 0 ? Math.floor(level) : 1;
  const safeRequired = Number.isFinite(expRequired) && expRequired > 0 ? Math.floor(expRequired) : 3000;
  const safeCurrent = Number.isFinite(expCurrent) ? Math.min(safeRequired, Math.max(0, Math.floor(expCurrent))) : 0;
  const safePercent = Number.isFinite(progressPercent) ? Math.min(100, Math.max(0, progressPercent)) : 0;

  return (
    <GlassSection variant="flat" className="profile-header overflow-hidden">
      <div className="relative p-5 sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70
            bg-[radial-gradient(circle_at_12%_30%,rgba(34,211,238,0.12),transparent_32%),radial-gradient(circle_at_88%_18%,rgba(217,70,239,0.12),transparent_34%)]"
        />

        <div className="relative grid grid-cols-[auto_minmax(0,1fr)] items-center gap-5 sm:gap-7">
          <button
            type="button"
            onClick={onAvatarClick}
            aria-label="Change avatar"
            title="Change avatar"
            className="group relative shrink-0 rounded-full outline-none transition-transform duration-200 hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-cyan-300/80"
          >
            <span className="block rounded-full border border-cyan-300/45 p-1 shadow-[0_0_26px_rgba(34,211,238,0.18),0_0_30px_rgba(217,70,239,0.12)]">
              {avatar}
            </span>

            <span
              aria-hidden
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border border-cyan-300/35 bg-slate-950/95 text-cyan-200/80 shadow-[0_0_16px_rgba(34,211,238,0.18)] transition group-hover:border-cyan-200/60 group-hover:text-cyan-100"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
              </svg>
            </span>
          </button>

          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-100/40 sm:text-[11px]">Player Profile</p>

              {onRefresh ? (
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={refreshing}
                  aria-label="Refresh profile"
                  title="Refresh profile"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-200/10 bg-slate-950/25 text-lg text-cyan-100/40 transition hover:border-cyan-300/25 hover:text-cyan-200 disabled:cursor-wait disabled:opacity-35"
                >
                  <span aria-hidden className={refreshing ? 'animate-spin' : ''}>
                    ↻
                  </span>
                </button>
              ) : null}
            </div>

            <h1 className="mt-1 break-words text-3xl font-bold leading-none tracking-tight text-white/95 drop-shadow-[0_0_18px_rgba(168,85,247,0.24)] sm:text-4xl">
              {username}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-fuchsia-200/90 sm:text-[11px]">
                Level {safeLevel}
              </span>
              <span className="text-xs font-medium tracking-wide text-cyan-100/50">
                {safeCurrent.toLocaleString()} / {safeRequired.toLocaleString()} XP
              </span>
            </div>

            <div className={`mt-3 ${S.progress.track} ${S.progress.height} ${S.progress.radius} overflow-hidden`}>
              <div
                className={[
                  S.progress.accent,
                  S.progress.height,
                  S.progress.radius,
                  'relative',
                  'after:absolute after:inset-0 after:bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.18)_45%,transparent_70%)] after:translate-x-[-40%] after:animate-[shimmer_2.4s_infinite]',
                ].join(' ')}
                style={{ width: `${safePercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </GlassSection>
  );
}
