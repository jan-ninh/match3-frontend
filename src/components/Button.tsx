type ButtonProps = {
  label: string;
  onClick?: () => void;
  className?: string;
};

export default function Button({ label, onClick, className = '' }: ButtonProps) {
  return (
    <button onClick={onClick} className={`px-6 py-2 rounded-md transition duration-200 ${className}`}>
      {label}
    </button>
  );
}