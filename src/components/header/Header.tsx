import React from 'react';
import TimeDisplay from './TimeDisplay';
import MovesDisplay from './MovesDisplay';
import TargetDisplay from './TargetDisplay';

export interface HeaderProps {
  time: string;
  moves: number;
  targetLabel?: string;
}

const Header: React.FC<HeaderProps> = ({ time, moves, targetLabel }) => {
  return (
    <div className="w-full flex justify-between items-center ">
      <TimeDisplay time={time} />
      <TargetDisplay label={targetLabel} />
      <MovesDisplay moves={moves} />
    </div>
  );
};

export default Header;
