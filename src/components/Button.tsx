import type { ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
};

export default function Button({ label, className = '', type = 'button', ...props }: ButtonProps) {
  const baseClasses = 'w-48 md:w-60 py-2 rounded text-white bg-neutral-800 hover:bg-neutral-500 transition-colors duration-200';

  return (
    <button type={type} className={`${baseClasses} ${className}`} {...props}>
      {label}
    </button>
  );
}
