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
    signOut: 'Sign out',
  },
  // Passaporte (WI-0005). Os valores (login, campus, nível…) vêm do snapshot.
  passport: {
    title: 'Your Passport',
    photoAlt: 'Your initials',
    alumni: 'Alumni',
    reduced: 'Piscine Passport: the full Passport unlocks when you start the Common Core.',
    detailsLabel: 'Passport details',
    campus: 'Campus',
    piscine: 'Piscine',
    coalition: 'Coalition',
    noCoalition: 'No coalition',
    level: 'Level',
    projects: 'Projects',
    noProjects: 'No projects yet.',
    aboutProject: 'What this project involves', // WI-0006
    mark: 'Mark',
    states: { done: 'Validated', failed: 'Failed', inProgress: 'In progress' },
    syncedAt: 'Last synced',
    timeZone: 'Lisbon time',
    notSynced: "Your Passport hasn't been synced yet. It syncs every time you sign in.",
    hiddenNotice: 'Your Passport is hidden from the community.', // WI-0009
    hiddenLink: 'Change this in your account',
  },
  // Conquistas (WI-0011). Os nomes e descrições das badges vêm de src/badges/catalog.json.
  badges: {
    title: 'Badges',
  },
  // Passaporte de outra pessoa (WI-0009, ADR 0010): só a vista pública.
  publicPassport: {
    photoAlt: 'Member initials',
    ownPreview: 'This is how the community sees your Passport.',
    notFoundTitle: 'Passport not found',
    notFound: "This Passport doesn't exist or isn't available.",
    backHome: 'Back to your Passport',
  },
  // Calculadora de XP (WI-0007, ADR 0009). Sem estimativa de nível (AC6).
  calculator: {
    title: 'XP Calculator',
    intro: 'See how much XP a Common Core project gives for a given mark.',
    project: 'Project',
    mark: 'Mark (0–125)',
    submit: 'Calculate',
    gained: 'XP gained',
    source: 'XP values from the 42 API, updated',
    currentLevel: 'Your current level',
    unavailable: 'The XP Calculator unlocks when you start the Common Core.',
    noData: "We couldn't load project XP from the 42 API. Please try again later.",
    errors: {
      notInteger: 'The mark must be a whole number.',
      outOfRange: 'The mark must be between 0 and 125.',
      unknownProject: 'Choose a project from the list.',
    },
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
      'Duck Hub keeps only what it needs to let you sign in and to show your Passport. Your 42 access token is used only during sign-in, to read your profile, and is never stored.',
    itemsLabel: 'What we keep and why',
    items: [
      { data: 'Your 42 user ID', purpose: 'To recognise your account when you sign in again.' },
      { data: 'Your 42 login', purpose: 'To identify your account in Duck Hub.' },
      { data: 'Your primary campus', purpose: 'To check that Duck Hub is open to your campus.' },
      {
        data: 'A hash of your session token and its expiry date',
        purpose: 'To keep you signed in. Sessions expire after 30 days without use.',
      },
      {
        data: 'Your Passport: campus name, Piscine month and year, Alumni status, coalition name and colour, cursus names and levels',
        purpose: 'To show your Passport without asking the 42 API on every visit.',
      },
      {
        data: 'Your projects: name, status, final mark and whether they were validated',
        purpose: 'To show your progress on your Passport.',
      },
      {
        data: 'When your Passport was last synced',
        purpose: 'To show how recent your Passport is. It syncs every time you sign in.',
      },
      {
        data: 'Whether you hid your Passport from the community',
        purpose: 'To show your Passport to other members, or keep it to yourself.',
      },
    ],
    // Lista o que os outros veem (ADR 0010): muda quando a vista pública mudar.
    visibility:
      'By default, your Passport is visible to other signed-in Duck Hub members. They see your login, campus, Piscine, coalition, Alumni status, level, badges and validated projects with their marks, never your failed or in-progress projects or when you last synced. You can hide it at any time in your account.',
    deletion: 'You can delete your account at any time. This removes everything listed above.',
    accountLink: 'Delete your account',
  },
  account: {
    title: 'Your account',
    // WI-0009: esconder ou mostrar o Passaporte à comunidade.
    visibility: {
      title: 'Passport visibility',
      visibleState: 'Your Passport is visible to the Duck Hub community.',
      hiddenState: 'Your Passport is hidden from the community. Only you can see it.',
      hide: 'Hide my Passport from the community',
      show: 'Show my Passport to the community',
    },
    deleteTitle: 'Delete your account',
    body: 'This signs you out and permanently removes everything Duck Hub keeps about you:',
    note: 'Your 42 Intra account is not affected.',
    confirm: 'Yes, delete my account',
    cancel: 'Keep my account',
  },
} as const;

export type Messages = typeof en;
