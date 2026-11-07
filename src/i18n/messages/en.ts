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
      community: 'Community', // WI-0010
      pond: 'Duck Pond', // WI-0012
      tavern: 'Tavern', // WI-0015
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
  // Diretório da comunidade (WI-0010, ADR 0012).
  community: {
    title: 'Community',
    intro: 'Duck Hub members who share their Passport with the community.',
    search: 'Search by login',
    campus: 'Campus',
    allCampuses: 'All campuses',
    submit: 'Search',
    listLabel: 'Members',
    level: 'Level',
    empty: 'No members match your search.',
    pagination: 'Pages',
    previous: 'Previous page',
    next: 'Next page',
  },
  // Duck Pond (WI-0012, ADR 0013). A nota usa passport.mark; o nome da badge vem do catálogo.
  pond: {
    title: 'Duck Pond',
    intro: 'What the community has achieved lately.',
    listLabel: 'Recent achievements',
    events: {
      projectValidated: 'validated',
      levelUp: 'reached level',
      badge: 'earned the badge',
    },
    empty: 'Nothing in the pond yet.',
    pagination: 'Pages',
    previous: 'Previous page',
    next: 'Next page',
    // Rubber Ducks (WI-0013, ADR 0014): só a contagem, nunca quem deu.
    ducks: {
      button: 'Give a Rubber Duck',
      countOne: 'Rubber Duck',
      countMany: 'Rubber Ducks',
    },
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
      {
        data: 'Your Duck Pond events: projects you validated (name and mark), new levels and new badges, with the date',
        purpose:
          'To show your achievements in the Duck Pond feed. Events are deleted after 90 days.',
      },
      {
        data: 'The Rubber Ducks you give: which Duck Pond event and when',
        purpose:
          'To count the Rubber Ducks on each event and to show you which ones you gave. Other members see only how many Ducks an event has, never who gave them. Your Ducks are deleted with the event.',
      },
      {
        // WI-0015: as colunas de work_profiles.
        data: 'Your work profile: when you like to work, when you want to start, your grade goal, your pace, how you like to work together, where you like to work and the role you prefer',
        purpose:
          'To suggest teammates in The Tavern. Only you can see your answers; other members see only how well you match and why. You can change or delete your work profile at any time.',
      },
      {
        // WI-0017: as colunas de lobby_entries.
        data: 'The Tavern lobbies you join: which group project and when you joined',
        purpose:
          'To show you to the other members of the same lobby on your campus, and only to them; others on your campus see only how many people are in it. You leave a lobby when you choose to, after 14 days, when you validate the project, or when you hide your Passport.',
      },
    ],
    // Lista o que os outros veem (ADR 0010): muda quando a vista pública mudar.
    visibility:
      'By default, your Passport is visible to other signed-in Duck Hub members, on your Passport page, in the community directory and in the Duck Pond feed. They see your login, campus, Piscine, coalition, Alumni status, level, badges and validated projects with their marks, never your failed or in-progress projects or when you last synced. You can hide it at any time in your account; this also hides your Duck Pond events, including past ones.',
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
  // WI-0014: o porquê de cada sugestão de equipa (ADR 0015).
  tavern: {
    reasons: {
      'shared-hours': 'You work at the same times of day',
      'same-start': 'You both want to start at the same time',
      'same-grade-goal': 'You aim for the same grade',
      'same-pace': 'You work at the same pace',
      'same-style': 'You like to work together the same way',
      'same-setting': 'You both prefer the same place to work',
      'complementary-roles': 'One of you likes to lead, the other to follow',
    },
    // WI-0017: o lobby LFG por projeto.
    lobby: {
      title: 'The Tavern',
      projectsLabel: 'Your group projects',
      suggested: 'The Intra says you are looking for a group',
      join: 'Join the lobby',
      // WI-0018: num lobby vazio, entrar é criá-lo.
      create: 'Create the lobby',
      leave: 'Leave the lobby',
      open: 'Open the lobby',
      noProjects:
        'No group project lobbies are open for you right now. Every group project on your campus that you have not validated yet has a lobby here.',
      noProfile:
        'You have no work profile yet. You can still join a lobby, but nobody will match with you until you answer the questions.',
      editProfile: 'Edit your work profile',
      hiddenPassport:
        'Your Passport is hidden from the community, so you cannot join a lobby. You can show it again in your account.',
      membersLabel: 'Other people in this lobby',
      empty: 'Nobody else from your campus is in this lobby yet. Check back later.',
      match: 'match',
      // WI-0018: antes de entrar vê-se só quantas pessoas estão no lobby.
      lookingOne: 'person in this lobby',
      lookingMany: 'people in this lobby',
    },
    // WI-0015: o questionário. As chaves de options são os valores do WI-0014,
    // pela mesma ordem; os rótulos são únicos em cada pergunta.
    profile: {
      title: 'Your work profile',
      privacy:
        'Tell us how you like to work, so The Tavern can suggest teammates. Every question is optional. Only you can see your answers; other members see only how well you match and why.',
      skip: 'Prefer not to say',
      save: 'Save my answers',
      delete: 'Delete my work profile',
      saved: 'Your answers were saved.',
      deleted: 'Your work profile was deleted.',
      questions: {
        periods: {
          label: 'When do you like to work? Pick all that apply.',
          options: {
            morning: 'Mornings',
            afternoon: 'Afternoons',
            evening: 'Evenings',
            night: 'Late nights',
          },
        },
        start: {
          label: 'When do you want to start?',
          options: {
            'this-week': 'This week',
            'two-weeks': 'In the next two weeks',
            'no-rush': 'No rush',
          },
        },
        gradeGoal: {
          label: 'What grade are you aiming for?',
          options: {
            pass: 'Just pass',
            bonus: 'Get the bonus',
            max: 'Go for 125',
          },
        },
        pace: {
          label: 'What pace do you like?',
          options: {
            sprint: 'Sprint and finish fast',
            steady: 'Steady, a bit every day',
            relaxed: 'Relaxed, no pressure',
          },
        },
        style: {
          label: 'How do you like to work together?',
          options: {
            pair: 'Side by side, pair programming',
            split: 'Split the work and merge',
            mixed: 'A bit of both',
          },
        },
        setting: {
          label: 'Where do you like to work?',
          options: {
            'on-site': 'On campus',
            hybrid: 'On campus and remote',
            remote: 'Remote',
          },
        },
        role: {
          label: 'Which role do you prefer?',
          options: {
            lead: 'I like to lead',
            follow: 'I like to follow a plan',
            either: 'Either is fine',
          },
        },
      },
    },
  },
} as const;

export type Messages = typeof en;
