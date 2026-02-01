interface TeilProps {
  color: string; // background color
  onClick?: () => void; // optional click handler
}

const Teil = ({ color, onClick }: TeilProps) => {
  return <div onClick={onClick} className="w-16 h-16 border border-black box-border cursor-pointer" style={{ backgroundColor: color }} />;
};

export default Teil;
