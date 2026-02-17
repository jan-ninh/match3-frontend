import type { ReactNode } from 'react';
import { CyberTitle, GlassSection } from '@/components';
// import { DASHBOARD_STYLE as S } from './theme';

type Props = {
  username: string;
  level: number;
  avatar: ReactNode; // right side (big)
  actions?: ReactNode; // left side (under username)
};

export default function ProfileHeader({ username, level, avatar, actions }: Props) {
  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  return (
    <GlassSection className="flex items-center justify-between gap-6">
      {/* Left: name + actions */}
      <div className="min-w-0 flex-col">
        {/* <p className={`${S.text.primary} text-3xl font-semibold leading-tight truncate`}>{capitalize(username)}</p> */}
        <CyberTitle size="lg" className="truncate">
          {capitalize(username)}
        </CyberTitle>
        {/* <p className={`${S.text.secondary} text-sm mt-0.5`}>Level {level}</p> */}
        <CyberTitle size="sm" className="mt-1 text-cyan-300/80">
          Level {level}
        </CyberTitle>
        {actions ? <div className="mt-3">{actions}</div> : null}
      </div>

      {/* Right: big avatar */}
      <div className="shrink-0">{avatar}</div>
    </GlassSection>
  );
}
