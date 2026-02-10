import type { ButtonHTMLAttributes } from 'react';

// type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
//   label: string;
// };

// export default function Button({ label, className = '', type = 'button', ...props }: ButtonProps) {
//   const baseClasses =
//     'group relative px-12 py-5 w-72 md:w-80 bg-linear-to-b from-purple-950/60 to-pink-950/40 border border-cyan-400/50 rounded-2xl text-cyan-200 font-bold text-xl tracking-wider shadow-[0_0_25px_rgba(6,182,212,0.6),inset_0_0_15px_rgba(236,72,153,0.3)] hover:shadow-[0_0_45px_rgba(6,182,212,0.9),inset_0_0_25px_rgba(236,72,153,0.5)] hover:scale-105 hover:border-cyan-300 transition-all duration-500 ease-out overflow-hidden';

//   return (
//     <button type={type} className={`${baseClasses} ${className}`} {...props}>
//       {label}
//     </button>
//   );
// }

// components/NeonButton.tsx

type NeonButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
};

export default function NeonButton({ label, className = '', ...props }: NeonButtonProps) {
  return (
    <button
      className={`
        group relative w-64 md:w-80 h-20
        flex items-center justify-center
        text-cyan-200 font-bold text-xl tracking-wider
        transition-all duration-300
        hover:scale-105 active:scale-95
        ${className}
      `}
      {...props}
    >
      {/* SVG background */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 320 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* لایه glow خارجی */}
        <path
          d="M 60,5 L 260,5 Q 290,5 290,40 Q 290,75 260,75 L 60,75 Q 30,75 30,40 Q 30,5 60,5 Z M 0,40 L 30,5 M 290,40 L 320,40"
          stroke="#ec4899"
          strokeWidth="4"
          strokeOpacity="0.6"
          className="group-hover:stroke-[#06b6d4] group-hover:stroke-opacity-90 transition-colors"
        />
        {/* لایه اصلی دکمه */}
        <path
          d="M 60,5 L 260,5 Q 290,5 290,40 Q 290,75 260,75 L 60,75 Q 30,75 30,40 Q 30,5 60,5 Z"
          fill="#1e1b4b"
          fillOpacity="0.7"
          stroke="#a78bfa"
          strokeWidth="3"
          className="group-hover:fill-[#2d1b69] group-hover:stroke-[#67e8f9] transition-all"
        />
        {/* inner glow */}
        <path
          d="M 65,10 L 255,10 Q 280,10 280,40 Q 280,70 255,70 L 65,70 Q 40,70 40,40 Q 40,10 65,10 Z"
          fill="none"
          stroke="#c084fc"
          strokeWidth="2"
          strokeOpacity="0.5"
          className="group-hover:stroke-opacity-80"
        />
      </svg>

      {/* متن دکمه */}
      <span className="relative z-10 drop-shadow-[0_0_8px_rgba(103,232,249,0.8)] group-hover:drop-shadow-[0_0_12px_rgba(103,232,249,1)] transition-all">
        {label}
      </span>
    </button>
  );
}
