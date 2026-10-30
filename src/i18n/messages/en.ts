// Todos os textos visíveis da UI. Os componentes leem daqui (AC5; o lint
// `react/jsx-no-literals` impede texto escrito nos componentes).

export const en = {
  app: {
    name: 'Duck Hub',
    description: 'The digital square of the 42 community.',
  },
  shell: {
    skipToContent: 'Skip to content',
    navLabel: 'Main',
    soon: 'Soon',
    items: {
      home: 'Home',
      passport: 'Passport',
      xpCalculator: 'XP Calculator',
    },
  },
  home: {
    eyebrow: '42 Portugal',
    title: 'Welcome to the pond',
    body: 'Your Passport, built from the 42 Intra with zero setup, is on its way.',
  },
} as const;

export type Messages = typeof en;
