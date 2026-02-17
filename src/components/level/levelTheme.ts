export const levelTheme = {
  container: 'p-4',
  grid: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3',

  shape: {
    // Octagon
    clip: '[clip-path:polygon(25%_6%,75%_6%,96%_50%,75%_94%,25%_94%,4%_50%)]',
  },

  button: {
    base: `
      group relative h-24 w-full
      flex flex-col items-center justify-center gap-1
      font-semibold tracking-wide
      select-none outline-none
      transition-transform duration-200
      ${'' /* visible glass gradient base */}
      bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(2,6,23,0.92))]
      backdrop-blur-md
      ${'' /* keep shape */}
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
