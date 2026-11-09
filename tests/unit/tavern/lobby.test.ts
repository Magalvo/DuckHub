// POST /tavern/lobby (WI-0017): a ordem das respostas e quem pode entrar,
// para lá do contrato e2e. Stores em memória; dados inventados.
import { describe, expect, it } from 'vitest';

import { hashToken, SESSION_COOKIE, type AuthDeps } from '../../../src/auth/handlers.js';
import {
  handleLobby,
  lobbyProjects,
  lookingLabel,
  matchLabel,
  sameProjectSlugs,
  type LobbyProject,
} from '../../../src/tavern/lobby.js';

const ORIGIN = 'http://localhost:3000';
const TOKEN = 'token-sintetico-lobby';
const NOW = 1_800_000_000_000;
const ME = 'user-1';
const MINISHELL = '42cursus-minishell';

function setup(init: { hidden?: boolean; projects?: LobbyProject[]; joinRefuses?: boolean } = {}) {
  const entries = new Set<string>();
  const calls: string[] = [];
  const auth: AuthDeps = {
    config: {
      clientId: 'id',
      clientSecret: 'segredo',
      redirectUri: `${ORIGIN}/auth/callback`,
      allowedCampusIds: [9001],
      secureCookies: false,
    },
    clock: { now: () => NOW },
    randomToken: () => 'aleatorio',
    exchangeCode: () => Promise.resolve({ ok: false }),
    fetchProfile: () => Promise.resolve({ ok: false, error: { kind: 'network' } }),
    syncPassport: () => Promise.resolve(),
    store: {
      upsertUser: () => Promise.resolve({ userId: ME }),
      createSession: () => Promise.resolve(),
      findSession: (h) =>
        Promise.resolve(h === hashToken(TOKEN) ? { userId: ME, expiresAt: NOW + 1 } : null),
      renewSession: () => Promise.resolve(),
      deleteSession: () => Promise.resolve(),
      deleteUser: () => Promise.resolve(),
    },
  };
  const deps = {
    auth,
    isHidden: () => {
      calls.push('isHidden');
      return Promise.resolve(init.hidden ?? false);
    },
    projectsOf: () => {
      calls.push('projectsOf');
      return Promise.resolve(
        init.projects ?? [{ slug: MINISHELL, name: 'minishell', suggested: false }]
      );
    },
    store: {
      // O join real decide na BD (WI-0022): escondido entretanto, devolve false.
      join: (userId: string, slug: string) => {
        if (init.joinRefuses === true) return Promise.resolve(false);
        entries.add(`${userId}:${slug}`);
        return Promise.resolve(true);
      },
      leave: (userId: string, slug: string) => {
        entries.delete(`${userId}:${slug}`);
        return Promise.resolve();
      },
    },
  };
  return { deps, entries, calls };
}

function post(body: string, init: { origin?: string; token?: string | null } = {}): Request {
  const headers = new Headers({ 'content-type': 'application/x-www-form-urlencoded' });
  if (init.token !== null) headers.set('cookie', `${SESSION_COOKIE}=${init.token ?? TOKEN}`);
  if (init.origin !== undefined) headers.set('origin', init.origin);
  return new Request(`${ORIGIN}/tavern/lobby`, { method: 'POST', headers, body });
}

const location = (res: Response): string | null => res.headers.get('location');

describe('handleLobby', () => {
  it('entrar cria a entrada e responde 303 para o lobby', async () => {
    const env = setup();
    const res = await handleLobby(post(`intent=join&project=${MINISHELL}`), env.deps);
    expect(res.status).toBe(303);
    expect(location(res)).toBe(`/tavern/${MINISHELL}`);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect([...env.entries]).toEqual([`${ME}:${MINISHELL}`]);
  });

  it('sair apaga a entrada e responde 303 para /tavern, mesmo sem entrada', async () => {
    const env = setup();
    env.entries.add(`${ME}:${MINISHELL}`);
    for (let i = 0; i < 2; i += 1) {
      const res = await handleLobby(post(`intent=leave&project=${MINISHELL}`), env.deps);
      expect(res.status).toBe(303);
      expect(location(res)).toBe('/tavern');
    }
    expect(env.entries.size).toBe(0);
  });

  it('sair funciona sempre: não pergunta pelo Passaporte nem pelos projetos', async () => {
    const env = setup({ hidden: true, projects: [] });
    env.entries.add(`${ME}:webserv`);
    const res = await handleLobby(post('intent=leave&project=webserv'), env.deps);
    expect(location(res)).toBe('/tavern');
    expect(env.entries.size).toBe(0);
    expect(env.calls).toEqual([]);
  });

  it('com o Passaporte escondido não se entra', async () => {
    const env = setup({ hidden: true });
    const res = await handleLobby(post(`intent=join&project=${MINISHELL}`), env.deps);
    expect(res.status).toBe(403);
    expect(env.entries.size).toBe(0);
  });

  it('escondido entre a verificação e o join (WI-0022): o join diz que não e dá 403', async () => {
    const env = setup({ joinRefuses: true });
    const res = await handleLobby(post(`intent=join&project=${MINISHELL}`), env.deps);
    expect(res.status).toBe(403);
    expect(location(res)).toBeNull();
    expect(env.entries.size).toBe(0);
  });

  it('só se entra num projeto dos lobbyProjects da pessoa', async () => {
    const env = setup();
    const res = await handleLobby(post('intent=join&project=webserv'), env.deps);
    expect(res.status).toBe(403);
    expect(env.entries.size).toBe(0);
  });

  it('Origin de outro site dá 403 antes de tudo', async () => {
    const env = setup();
    for (const init of [
      { origin: 'https://outro-site.example' },
      { origin: 'https://outro-site.example', token: null },
    ]) {
      const res = await handleLobby(post(`intent=join&project=${MINISHELL}`, init), env.deps);
      expect(res.status).toBe(403);
    }
    expect(env.entries.size).toBe(0);
  });

  it('sem sessão vai para o login', async () => {
    const env = setup();
    const res = await handleLobby(
      post(`intent=join&project=${MINISHELL}`, { token: null }),
      env.deps
    );
    expect(res.status).toBe(303);
    expect(location(res)).toBe('/login');
  });

  it.each([
    ['intent desconhecido', `intent=destroy&project=${MINISHELL}`],
    ['sem intent', `project=${MINISHELL}`],
    ['intent repetido', `intent=join&intent=join&project=${MINISHELL}`],
    ['sem projeto', 'intent=join'],
    ['projeto vazio', 'intent=leave&project='],
    ['projeto repetido', `intent=leave&project=${MINISHELL}&project=webserv`],
    ['projeto com caminho', 'intent=join&project=../account'],
    ['projeto com maiúsculas', 'intent=leave&project=Minishell'],
    ['projeto a começar por hífen', 'intent=leave&project=-minishell'],
  ])('%s dá 400 sem tocar em nada', async (_case, body) => {
    const env = setup();
    env.entries.add(`${ME}:${MINISHELL}`);
    const res = await handleLobby(post(body), env.deps);
    expect(res.status).toBe(400);
    expect([...env.entries]).toEqual([`${ME}:${MINISHELL}`]);
    expect(env.calls).toEqual([]);
  });

  it('um corpo que não é formulário dá 400', async () => {
    const env = setup();
    const req = new Request(`${ORIGIN}/tavern/lobby`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `${SESSION_COOKIE}=${TOKEN}` },
      body: '{}',
    });
    expect((await handleLobby(req, env.deps)).status).toBe(400);
  });
});

describe('matchLabel', () => {
  it('mostra a pontuação inteira com a palavra', () => {
    expect(matchLabel(78, 'match')).toBe('78% match');
    expect(matchLabel(0, 'match')).toBe('0% match');
  });
});

describe('lookingLabel (WI-0018)', () => {
  it('singular só para 1', () => {
    expect(lookingLabel(0, 'pessoa', 'pessoas')).toBe('0 pessoas');
    expect(lookingLabel(1, 'pessoa', 'pessoas')).toBe('1 pessoa');
    expect(lookingLabel(3, 'pessoa', 'pessoas')).toBe('3 pessoas');
  });
});

describe('lobbyProjects (WI-0018)', () => {
  const snap = (projects: { slug: string; status: string; validated: boolean | null }[]) => ({
    login: 'pato-teste',
    campus: 'Campus Sintético',
    piscine: { month: 'september', year: 2023 },
    isAlumni: false,
    coalition: null,
    cursus: [],
    projects: projects.map((p) => ({ ...p, name: `snapshot ${p.slug}`, finalMark: null })),
  });
  const catalog = [
    { slug: 'a', name: 'A', solo: false },
    { slug: 'b', name: 'B', solo: false },
  ];

  it('o nome vem do catálogo; validated null ou false não fecha o lobby', () => {
    expect(
      lobbyProjects(
        snap([
          { slug: 'a', status: 'searching_a_group', validated: null },
          { slug: 'b', status: 'finished', validated: false },
        ]),
        catalog
      )
    ).toEqual([
      { slug: 'a', name: 'A', suggested: true },
      { slug: 'b', name: 'B', suggested: false },
    ]);
  });

  it('um snapshot vazio abre todos os projetos de grupo', () => {
    expect(lobbyProjects(snap([]), catalog).map((p) => p.slug)).toEqual(['a', 'b']);
  });
});

describe('lobbyProjects com grupos de slugs (WI-0018)', () => {
  const snap = (projects: { slug: string; status: string; validated: boolean | null }[]) => ({
    login: 'pato-teste',
    campus: 'Campus Sintético',
    piscine: { month: 'september', year: 2023 },
    isAlumni: false,
    coalition: null,
    cursus: [],
    projects: projects.map((p) => ({ ...p, name: `snapshot ${p.slug}`, finalMark: null })),
  });
  const groups = [['novo', 'antigo']] as const;

  it('a posição é a da primeira entrada do grupo, mesmo que seja o slug secundário', () => {
    const catalog = [
      { slug: 'a', name: 'A', solo: false },
      { slug: 'antigo', name: 'Antigo', solo: false },
      { slug: 'b', name: 'B', solo: false },
      { slug: 'novo', name: 'Novo', solo: false },
    ];
    expect(lobbyProjects(snap([]), catalog, groups)).toEqual([
      { slug: 'a', name: 'A', suggested: false },
      { slug: 'novo', name: 'Novo', suggested: false },
      { slug: 'b', name: 'B', suggested: false },
    ]);
  });

  it('um slug validado fecha o lobby mesmo com o outro falhado', () => {
    const catalog = [
      { slug: 'novo', name: 'Novo', solo: false },
      { slug: 'antigo', name: 'Antigo', solo: false },
    ];
    const got = lobbyProjects(
      snap([
        { slug: 'novo', status: 'finished', validated: false },
        { slug: 'antigo', status: 'finished', validated: true },
      ]),
      catalog,
      groups
    );
    expect(got).toEqual([]);
  });

  it('com solo diferente nos slugs, basta um de grupo (exceção ao ADR 0016)', () => {
    const catalog = [
      { slug: 'antigo', name: 'Antigo', solo: true },
      { slug: 'x', name: 'X', solo: false },
      { slug: 'novo', name: 'Novo', solo: false },
    ];
    expect(lobbyProjects(snap([]), catalog, groups)).toEqual([
      { slug: 'novo', name: 'Novo', suggested: false },
      { slug: 'x', name: 'X', suggested: false },
    ]);
    const allSolo = catalog.map((c) => ({ ...c, solo: true }));
    expect(lobbyProjects(snap([]), allSolo, groups)).toEqual([]);
  });

  it('grupos fora do catálogo não mudam nada', () => {
    const catalog = [{ slug: 'a', name: 'A', solo: false }];
    expect(lobbyProjects(snap([]), catalog, groups)).toEqual(lobbyProjects(snap([]), catalog));
  });
});

describe('sameProjectSlugs (WI-0018)', () => {
  const groups = [
    ['novo', 'antigo'],
    ['x1', 'x2', 'x3'],
  ] as const;

  it('junta os outros slugs do grupo de cada slug, sem repetir', () => {
    expect([...sameProjectSlugs(['antigo', 'a', 'x2', 'novo'], groups)].sort()).toEqual(
      ['a', 'antigo', 'novo', 'x1', 'x2', 'x3'].sort()
    );
  });

  it('sem slugs, nenhum', () => {
    expect(sameProjectSlugs([], groups)).toEqual([]);
  });
});
