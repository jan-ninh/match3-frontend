type ButtonProps = {
  label: string;
  onClick?: () => void;
  className?: string;
};

const Button = ({ label, onClick, className = '' }: ButtonProps) => {
  return (
    <button onClick={onClick} className={`px-6 py-2 rounded-md w-md transition duration-200 ${className}`}>
      {label}
    </button>
  );
};

export default Button;
