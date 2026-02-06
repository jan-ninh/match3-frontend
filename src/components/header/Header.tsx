// import TimeDisplay from './TimeDisplay';
// import MovesDisplay from './MovesDisplay';
// import TargetDisplay from './TargetDisplay';

export type HeaderProps = {
  time: string;
  moves: number;
  targetLabel?: string;
};

export default function Header() {
  return <div className="w-full flex justify-between items-center" />;
}
