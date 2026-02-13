type Props = {
  count: number;
  filledCount: number;
  className: string;
  pipClassName: (filled: boolean, i: number) => string;
};

export function PipsRow({ count, filledCount, className, pipClassName }: Props) {
  return (
    <div className={className}>
      {Array.from({ length: count }, (_, i) => {
        const filled = i < filledCount;
        return <div key={i} className={pipClassName(filled, i)} />;
      })}
    </div>
  );
}
