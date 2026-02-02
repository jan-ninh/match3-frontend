type Props = {
  color: string;
  onClick?: () => void;
};

export default function Tile({ color, onClick }: Props) {
  return <div onClick={onClick} className="w-16 h-16 border border-black box-border cursor-pointer" style={{ backgroundColor: color }} />;
}