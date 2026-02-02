import TimeDisplay from './TimeDisplay';
import MovesDisplay from './MovesDisplay';
import TargetDisplay from './TargetDisplay';

export type HeaderProps = {
  time: string;
  moves: number;
  targetLabel?: string;
};

export default function Header({ time, moves, targetLabel }: HeaderProps) {
  return (
    <div className="w-full flex justify-between items-center">
      <TimeDisplay time={time} />
      <TargetDisplay label={targetLabel} />
      <MovesDisplay moves={moves} />
    </div>
  );
}