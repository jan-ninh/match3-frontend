import React from 'react';

interface TimeDisplayProps {
  time: string;
}

const TimeDisplay: React.FC<TimeDisplayProps> = ({ time }) => {
  return (
    <>
      <div className="flex flex-col items-center justify-center relative">
        {/* Upper span */}
        <span className="text-xl font-bold bg-gray-200 w-16 h-8 rounded-sm shadow-md flex items-center justify-center">{time}</span>

        {/* Lower span overlaps a bit under the upper span */}
        <span className="text-xl text-center bg-gray-600 w-24 h-12 rounded-sm -mt-1 flex items-center justify-center">Time</span>
      </div>
    </>
  );
};

export default TimeDisplay;
