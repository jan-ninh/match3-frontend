export const levelTheme = {
  container: 'w-full max-w-[600px] mx-auto p-2',

  grid: 'grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3',

  shape: {
    // Octagon
    clip: '[clip-path:polygon(25%_6%,75%_6%,96%_50%,75%_94%,25%_94%,4%_50%)]',
  },

  button: {
    base: `
      group relative w-full min-w-0 aspect-[4/3]
      flex flex-col items-center justify-center gap-1
      font-semibold tracking-wide
      select-none focus-visible:outline-2 focus-visible:outline-cyan-300
      transition-transform duration-200
      bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(2,6,23,0.92))]
      backdrop-blur-md
    `,

    locked: `
      cursor-not-allowed opacity-95
      text-pink-200
    `,

    active: `
      cursor-pointer
      text-cyan-200
    `,
  },
};
