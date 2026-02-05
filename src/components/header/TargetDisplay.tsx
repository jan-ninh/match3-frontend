type Props = { label?: string };

export default function TargetDisplay({ label = 'Target' }: Props) {
  return <div className="border-2 border-dashed p-4 h-12 flex items-center justify-center rounded-md  border-white/20">{label}</div>;
}
