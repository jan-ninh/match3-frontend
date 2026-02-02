type Props = { label?: string };

export default function TargetDisplay({ label = 'Target' }: Props) {
  return (
    <div className="border-2 border-dashed w-24 h-12 flex items-center justify-center border-gray-300 text-gray-800 bg-white">
      {label}
    </div>
  );
}