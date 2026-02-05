type Props = { time: string };

export default function TimeDisplay({ time }: Props) {
  return (
    <div className="flex flex-col items-center justify-center relative">
      <span className="text-xl font-bold bg-gray-200 text-gray-900 w-16 h-8 rounded-sm shadow-md flex items-center justify-center">{time}</span>
      <span className="text-xl text-center border-2 border-dashed border-white/20 w-24 h-12 rounded-sm -mt-1 flex items-center justify-center">Time</span>
    </div>
  );
}
