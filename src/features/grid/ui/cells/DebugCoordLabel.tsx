type Props = {
  x: number;
  y: number;
};

export function DebugCoordLabel({ x, y }: Props) {
  return (
    <div className="absolute top-1 left-1 text-[10px] leading-none text-white/80 drop-shadow">
      {x},{y}
    </div>
  );
}
