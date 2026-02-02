import { DASHBOARD_STYLE as S } from './theme';

type Props = {
  username: string;
  level: number;
  children: React.ReactNode;
};

const ProfileHeader = ({ username, level, children }: Props) => (
  <div className={`flex items-center gap-4 ${S.glass.full} ${S.glass.bg} ${S.glass.blur} ${S.glass.border} ${S.glass.radius} ${S.glass.padding}`}>
    {children}
    <div>
      <p className={`text-2xl font-semibold ${S.text.primary}`}>{username}</p>
      <p className={`text-xl ${S.text.secondary}`}>Level {level}</p>
      <a className={`text-xl ${S.text.secondary}`}>change Avatar</a>
    </div>
  </div>
);

export default ProfileHeader;
