import { DASHBOARD_STYLE as S } from './theme';
import type { ReactNode } from 'react';

type Props = {
  username: string;
  level: number;
  children: ReactNode;
};

export default function ProfileHeader({ username, level, children }: Props) {
  return (
    <div className={`flex items-center gap-4 ${S.glass.full} ${S.glass.bg} ${S.glass.blur} ${S.glass.border} ${S.glass.radius} ${S.glass.padding}`}>
      {children}
      <div>
        <p className={`text-2xl font-semibold ${S.text.primary}`}>{username}</p>
        <p className={`text-xl ${S.text.secondary}`}>Level {level}</p>
        <button type="button" className={`text-sm ${S.text.secondary}`}>
          Change avatar
        </button>
      </div>
    </div>
  );
}
