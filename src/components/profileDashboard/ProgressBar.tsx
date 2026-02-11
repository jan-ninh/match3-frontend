// import { DASHBOARD_STYLE as S } from './theme';

// type Props = { percent: number };

// export default function ProgressBar({ percent }: Props) {
//   return (
//     <div className={`${S.glass.full}`}>
//       <div className={`${S.progress.track} ${S.progress.height} ${S.progress.radius}`}>
//         <div className={`${S.progress.accent} ${S.progress.height} ${S.progress.radius}`} style={{ width: `${percent}%` }} />
//       </div>
//     </div>
//   );
// }

import { DASHBOARD_STYLE as S } from './theme';

type Props = { percent: number };

export default function ProgressBar({ percent }: Props) {
  return (
    <div className={`${S.glass.full}`}>
      <p className={`mb-2 text-[13px] tracking-wide ${S.text.secondary}`}>Progress</p>

      <div className={`${S.progress.track} ${S.progress.height} ${S.progress.radius} overflow-hidden`}>
        <div
          className={[
            S.progress.accent,
            S.progress.height,
            S.progress.radius,
            'relative',
            'after:absolute after:inset-0 after:bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.18)_45%,transparent_70%)] after:translate-x-[-40%] after:animate-[shimmer_2.4s_infinite]',
          ].join(' ')}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
