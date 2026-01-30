import React from 'react';
import Header from './header/Header';
import Grid from './Grid';

const initialGrid = [
  ['#E5E7EB', '#D1D5DB', '#9CA3AF', '#6B7280', '#E5E7EB', '#D1D5DB', '#9CA3AF', '#6B7280'],
  ['#D1D5DB', '#E5E7EB', '#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB', '#6B7280', '#9CA3AF'],
  ['#9CA3AF', '#6B7280', '#E5E7EB', '#D1D5DB', '#9CA3AF', '#6B7280', '#E5E7EB', '#D1D5DB'],
  ['#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB', '#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB'],
  ['#E5E7EB', '#D1D5DB', '#9CA3AF', '#6B7280', '#E5E7EB', '#D1D5DB', '#9CA3AF', '#6B7280'],
  ['#D1D5DB', '#E5E7EB', '#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB', '#6B7280', '#9CA3AF'],
  ['#9CA3AF', '#6B7280', '#E5E7EB', '#D1D5DB', '#9CA3AF', '#6B7280', '#E5E7EB', '#D1D5DB'],
  ['#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB', '#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB'],
  ['#E5E7EB', '#D1D5DB', '#9CA3AF', '#6B7280', '#E5E7EB', '#D1D5DB', '#9CA3AF', '#6B7280'],
];

const GameContainer: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-between space-y-4  p-4">
      <Header time="12:45" moves={15} targetLabel="Collect Stars" />
      <Grid rows={9} cols={8} gridData={initialGrid} />
    </div>
  );
};

export default GameContainer;
