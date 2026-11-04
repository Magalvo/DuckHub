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
    signOut: 'Sign out',
  },
  // Os nomes dos campus acompanham ALLOWED_CAMPUS_IDS (ADR 0007).
  login: {
    title: 'Sign in',
    body: 'Duck Hub is open to students and alumni of 42 Lisboa and 42 Porto.',
    signIn: 'Sign in with 42',
    errors: {
      campus:
        'Duck Hub is only open to 42 Lisboa and 42 Porto for now. Your primary campus is not one of them.',
      oauth: "We couldn't sign you in with 42. Please try again.",
    },
    privacyLink: 'What data we keep',
  },
  // A lista bate com as colunas de src/db/schema.ts: mudar uma obriga a mudar a outra.
  privacy: {
    title: 'Privacy',
    intro:
      'Duck Hub keeps only what it needs to let you sign in. Your 42 access tokens are used once during sign-in and never stored.',
    itemsLabel: 'What we keep and why',
    items: [
      { data: 'Your 42 user ID', purpose: 'To recognise your account when you sign in again.' },
      { data: 'Your 42 login', purpose: 'To identify your account in Duck Hub.' },
      { data: 'Your primary campus', purpose: 'To check that Duck Hub is open to your campus.' },
      {
        data: 'A hash of your session token and its expiry date',
        purpose: 'To keep you signed in. Sessions expire after 30 days without use.',
      },
    ],
    deletion: 'You can delete your account at any time. This removes everything listed above.',
    accountLink: 'Delete your account',
  },
  account: {
    title: 'Delete your account',
    body: 'This signs you out and permanently removes everything Duck Hub keeps about you:',
    note: 'Your 42 Intra account is not affected.',
    confirm: 'Yes, delete my account',
    cancel: 'Keep my account',
  },
} as const;

export type Messages = typeof en;
