interface TargetDisplayProps {
  label?: string;
}

const TargetDisplay = ({ label = 'Target' }: TargetDisplayProps) => {
  return (
    <div
      className="border-2 border-dashed w-24 h-12 flex items-center justify-centerborder-gray-300
text-gray-800"
    >
      {label}
    </div>
  );
};

export default TargetDisplay;
