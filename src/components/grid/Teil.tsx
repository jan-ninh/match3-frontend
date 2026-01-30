import React from 'react';

interface TeilProps {
  color: string; // background color
  onClick?: () => void; // optional click handler
}

const Teil: React.FC<TeilProps> = ({ color, onClick }) => {
  return <div onClick={onClick} className="w-16 h-16 border border-black box-border cursor-pointer" style={{ backgroundColor: color }} />;
};

export default Teil;
