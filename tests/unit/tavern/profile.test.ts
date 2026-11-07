// POST /tavern/profile/answers (WI-0015): a ordem das respostas e o direito
// de apagar, para lá do contrato e2e. Stores em memória; dados inventados.
import { describe, expect, it } from 'vitest';

import { hashToken, SESSION_COOKIE, type AuthDeps } from '../../../src/auth/handlers.js';
import { handleProfileAnswers, type WorkAnswers } from '../../../src/tavern/profile.js';

const ORIGIN = 'http://localhost:3000';
const TOKEN = 'token-sintetico-tavern';
const NOW = 1_800_000_000_000;
const ME = 'user-1';

function setup(initial: WorkAnswers | null = { pace: 'sprint' }) {
  const profiles = new Map<string, WorkAnswers>();
  if (initial !== null) profiles.set(ME, initial);
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
  const store = {
    save: (userId: string, answers: WorkAnswers) => {
      if (Object.keys(answers).length === 0) profiles.delete(userId);
      else profiles.set(userId, answers);
      return Promise.resolve();
    },
    delete: (userId: string) => {
      profiles.delete(userId);
      return Promise.resolve();
    },
  };
  return { deps: { auth, store }, profiles };
}

function post(
  body: string | FormData,
  init: { origin?: string; token?: string | null } = {}
): Request {
  const headers = new Headers();
  if (typeof body === 'string') headers.set('content-type', 'application/x-www-form-urlencoded');
  if (init.token !== null) headers.set('cookie', `${SESSION_COOKIE}=${init.token ?? TOKEN}`);
  if (init.origin !== undefined) headers.set('origin', init.origin);
  return new Request(`${ORIGIN}/tavern/profile/answers`, { method: 'POST', headers, body });
}

const location = (res: Response): string | null => res.headers.get('location');

describe('handleProfileAnswers', () => {
  it('guardar responde 303 ?saved=1 e substitui as respostas', async () => {
    const env = setup();
    const res = await handleProfileAnswers(
      post('intent=save&periods=night&periods=morning&role=lead', { origin: ORIGIN }),
      env.deps
    );
    expect(res.status).toBe(303);
    expect(location(res)).toBe('/tavern/profile?saved=1');
    expect(env.profiles.get(ME)).toEqual({ periods: ['morning', 'night'], role: 'lead' });
  });

  it('sem intent conta como guardar', async () => {
    const env = setup(null);
    const res = await handleProfileAnswers(post('style=pair'), env.deps);
    expect(location(res)).toBe('/tavern/profile?saved=1');
    expect(env.profiles.get(ME)).toEqual({ style: 'pair' });
  });

  it('guardar sem nenhuma resposta apaga e responde ?deleted=1', async () => {
    const env = setup();
    const res = await handleProfileAnswers(post('intent=save&pace=&role='), env.deps);
    expect(res.status).toBe(303);
    expect(location(res)).toBe('/tavern/profile?deleted=1');
    expect(env.profiles.has(ME)).toBe(false);
  });

  it('apagar responde 303 ?deleted=1', async () => {
    const env = setup();
    const res = await handleProfileAnswers(post('intent=delete'), env.deps);
    expect(location(res)).toBe('/tavern/profile?deleted=1');
    expect(env.profiles.has(ME)).toBe(false);
  });

  it('apagar funciona sempre, mesmo com respostas inválidas (direito de apagar)', async () => {
    const env = setup();
    const res = await handleProfileAnswers(
      post('intent=delete&pace=fast&periods=noon&role=lead&role=lead'),
      env.deps
    );
    expect(res.status).toBe(303);
    expect(location(res)).toBe('/tavern/profile?deleted=1');
    expect(env.profiles.has(ME)).toBe(false);
  });

  it('apagar sem perfil não falha', async () => {
    const env = setup(null);
    const res = await handleProfileAnswers(post('intent=delete'), env.deps);
    expect(location(res)).toBe('/tavern/profile?deleted=1');
  });

  it('Origin de outro site dá 403 antes de tudo, mesmo sem sessão', async () => {
    const env = setup();
    const origin = 'https://outro-site.example';
    for (const init of [{ origin }, { origin, token: null }]) {
      const res = await handleProfileAnswers(post('intent=delete', init), env.deps);
      expect(res.status).toBe(403);
    }
    expect(env.profiles.has(ME)).toBe(true);
  });

  it('sem sessão (ou sessão desconhecida) vai para o login', async () => {
    const env = setup();
    for (const token of [null, 'token-que-nao-existe']) {
      const res = await handleProfileAnswers(post('intent=delete', { token }), env.deps);
      expect(res.status).toBe(303);
      expect(location(res)).toBe('/login');
    }
    expect(env.profiles.has(ME)).toBe(true);
  });

  it.each([
    ['desconhecido', 'intent=destroy'],
    ['vazio', 'intent='],
    ['repetido', 'intent=save&intent=delete'],
    ['repetido igual', 'intent=delete&intent=delete'],
  ])('intent %s dá 400 e não mexe no perfil', async (_case, body) => {
    const env = setup();
    const res = await handleProfileAnswers(post(body), env.deps);
    expect(res.status).toBe(400);
    expect(env.profiles.get(ME)).toEqual({ pace: 'sprint' });
  });

  it('o intent tem de ser texto: um ficheiro dá 400', async () => {
    const env = setup();
    const data = new FormData();
    data.append('intent', new Blob(['delete']), 'intent.txt');
    const res = await handleProfileAnswers(post(data), env.deps);
    expect(res.status).toBe(400);
    expect(env.profiles.has(ME)).toBe(true);
  });

  it('guardar com respostas inválidas dá 400 e não mexe no perfil', async () => {
    const env = setup();
    for (const body of [
      'intent=save&pace=fast',
      'role=Lead',
      'periods=',
      'start=this-week&start=no-rush',
    ]) {
      const res = await handleProfileAnswers(post(body), env.deps);
      expect(res.status, body).toBe(400);
    }
    expect(env.profiles.get(ME)).toEqual({ pace: 'sprint' });
  });

  it('um corpo que não é formulário dá 400', async () => {
    const env = setup();
    const req = new Request(`${ORIGIN}/tavern/profile/answers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `${SESSION_COOKIE}=${TOKEN}` },
      body: '{"intent":"delete"}',
    });
    const res = await handleProfileAnswers(req, env.deps);
    expect(res.status).toBe(400);
    expect(env.profiles.has(ME)).toBe(true);
  });

  it('as respostas 303 não ficam em cache', async () => {
    const env = setup();
    const res = await handleProfileAnswers(post('pace=steady'), env.deps);
    expect(res.headers.get('cache-control')).toBe('no-store');
  });
});
