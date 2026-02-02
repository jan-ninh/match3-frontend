import React from 'react';

interface TargetDisplayProps {
  label?: string;
}

const TargetDisplay: React.FC<TargetDisplayProps> = ({ label = 'Target' }) => {
  return <div className="border-2 border-dashed border-white w-24 h-12 flex items-center justify-center text-white">{label}</div>;
};

export default TargetDisplay;
