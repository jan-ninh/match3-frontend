import type { ReactNode } from 'react';
import { GlassSection } from '@/components';
import { DASHBOARD_STYLE as S } from './theme';

type Props = {
  username: string;
  level: number;
  children: ReactNode;
};

export default function ProfileHeader({ username, level, children }: Props) {
  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  return (
    <GlassSection className="flex items-center gap-4">
      {children}

      <div className="min-w-0">
        <p className={`${S.text.primary} text-lg font-semibold leading-tight truncate`}>{capitalize(username)}</p>
        <p className={`${S.text.secondary} text-sm mt-0.5`}>Level {level}</p>

        <button type="button" className={`${S.button.ghost} text-sm mt-2`}>
          Change avatar
        </button>
      </div>
    </GlassSection>
  );
}
