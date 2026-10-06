export const levelTheme = {
  container: 'relative w-full max-w-[600px] mx-auto px-2 py-4',

  grid: 'relative z-10 grid grid-cols-3 gap-x-4 gap-y-5 sm:gap-x-7 sm:gap-y-6',

  shape: {
    clip: '[clip-path:polygon(25%_6%,75%_6%,96%_50%,75%_94%,25%_94%,4%_50%)]',
  },

  button: {
    base: `
      group relative w-full min-w-0 aspect-[1.38/1] sm:aspect-[1.58/1]
      flex items-center justify-center
      overflow-visible select-none
      font-semibold tracking-wide
      transition-[filter,opacity] duration-150 ease-out
      focus-visible:outline-2 focus-visible:outline-cyan-300
    `,

    locked: `
      cursor-not-allowed opacity-58
    `,

    completed: `
      cursor-default opacity-74
      drop-shadow-[0_0_5px_rgba(52,211,153,0.1)]
    `,

    active: `
      cursor-pointer opacity-100
      drop-shadow-[0_0_8px_rgba(34,211,238,0.28)]
      hover:brightness-110
      hover:drop-shadow-[0_0_12px_rgba(34,211,238,0.48)]
    `,
  },
};
