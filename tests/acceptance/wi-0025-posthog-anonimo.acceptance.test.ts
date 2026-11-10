// tests/acceptance/wi-0025-posthog-anonimo.acceptance.test.ts
//
// Rascunho preparado pelo Claude a pedido do humano, com as decisões do ADR
// 0019 (2026-11-09: PostHog na UE, sem cookies, anónimo, lista fechada de
// eventos) e de 2026-11-10 (fora de produção aceita-se um host local, para o
// e2e). O comportamento no browser está em e2e/wi-0025.e2e.ts. Revê antes do
// commit: depois de entrar, isto é o contrato. Dados inventados.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { posthogConfig, POSTHOG_EU_HOST } from '../../src/analytics/config.js';
import { analyticsEvent, ANALYTICS_EVENTS } from '../../src/analytics/events.js';
import {
  DENIED_PREFIXES,
  DENIED_PROPERTIES,
  stripPersonalData,
} from '../../src/analytics/privacy.js';
import { ROUTE_TEMPLATES, routeTemplate } from '../../src/analytics/routes.js';

const KEY = 'phc_sintetico_0025';

// ---------- AC1, AC2: quando o PostHog arranca ----------

describe('WI-0025 — posthogConfig', () => {
  it.each([undefined, '', '   '])('AC1: sem chave (%j), null', (key) => {
    expect(posthogConfig({ key, host: POSTHOG_EU_HOST, production: true })).toBeNull();
    expect(posthogConfig({ key, host: undefined, production: false })).toBeNull();
  });

  it('AC2: o host da UE é o esperado', () => {
    expect(POSTHOG_EU_HOST).toBe('https://eu.i.posthog.com');
  });

  it.each([undefined, '', POSTHOG_EU_HOST])('AC2: em produção, o host %j dá a UE', (host) => {
    const config = posthogConfig({ key: KEY, host, production: true });
    expect(config?.key).toBe(KEY);
    expect(config?.options.api_host).toBe(POSTHOG_EU_HOST);
  });

  it.each([
    'https://us.i.posthog.com',
    'https://eu.posthog.com',
    'http://eu.i.posthog.com',
    'https://eu.i.posthog.com.example.com',
    'https://analytics.example.com',
    'http://localhost:3100/ingest-e2e',
    'http://127.0.0.1:3100/ingest-e2e',
    'nao-e-um-url',
  ])('AC2: em produção, o host %s dá null', (host) => {
    expect(posthogConfig({ key: KEY, host, production: true })).toBeNull();
  });

  it.each([
    'http://localhost:3100/ingest-e2e',
    'http://127.0.0.1:3100/ingest-e2e',
    'https://localhost:8443',
  ])('AC2: fora de produção, o host local %s é aceite', (host) => {
    expect(posthogConfig({ key: KEY, host, production: false })?.options.api_host).toBe(host);
  });

  it.each([
    'https://us.i.posthog.com',
    'http://localhost.example.com',
    'http://127.0.0.2:3100',
    'ftp://localhost',
  ])('AC2: fora de produção, o host %s continua a dar null', (host) => {
    expect(posthogConfig({ key: KEY, host, production: false })).toBeNull();
  });
});

// ---------- AC3: as opções ----------

describe('WI-0025 — opções do posthog.init', () => {
  const options = posthogConfig({ key: KEY, host: undefined, production: true })?.options;

  it('AC3: sem armazenamento, sem captura automática, anónimo', () => {
    expect(options).toMatchObject({
      api_host: POSTHOG_EU_HOST,
      persistence: 'memory',
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      capture_performance: false,
      disable_surveys: true,
      capture_exceptions: false,
      person_profiles: 'never',
      respect_dnt: true,
      advanced_disable_flags: true,
      disable_external_dependency_loading: true,
      disable_web_experiments: true,
      disable_product_tours: true,
      capture_dead_clicks: false,
      capture_heatmaps: false,
      rageclick: false,
      save_referrer: false,
    });
  });

  it('AC3: o before_send é o stripPersonalData', () => {
    const before = options?.before_send;
    const fns = Array.isArray(before) ? before : [before];
    expect(fns).toContain(stripPersonalData);
  });

  it('AC3: nada de bootstrap com uma identidade', () => {
    expect(options?.bootstrap).toBeUndefined();
  });
});

// ---------- AC4: o before_send ----------

describe('WI-0025 — stripPersonalData', () => {
  it('AC4: as listas têm as propriedades e os prefixos do ADR', () => {
    expect([...DENIED_PROPERTIES].sort()).toEqual(
      ['$current_url', '$pathname', '$referrer', '$referring_domain'].sort()
    );
    expect([...DENIED_PREFIXES].sort()).toEqual(
      ['$initial_', '$session_entry_', '$prev_pageview_'].sort()
    );
  });

  it('AC4: tira as propriedades com URLs e as dos prefixos, e deixa o resto', () => {
    const event = {
      event: 'page_viewed',
      properties: {
        route: '/u/[login]',
        $current_url: 'http://localhost:3100/u/pato-teste',
        $pathname: '/u/pato-teste',
        $referrer: 'http://localhost:3100/community?q=pato-teste',
        $referring_domain: 'localhost:3100',
        $initial_current_url: 'http://localhost:3100/u/pato-teste',
        $initial_referrer: '$direct',
        // Vistos no e2e de 2026-11-10: levavam o login.
        $session_entry_url: 'http://localhost:3100/u/pato-teste',
        $session_entry_pathname: '/u/pato-teste',
        $prev_pageview_pathname: '/u/pato-teste',
        $browser: 'Chrome',
      },
      $set_once: { $initial_pathname: '/u/pato-teste', outra: 'fica' },
      $set: { $current_url: 'http://localhost:3100/u/pato-teste' },
    };
    const out = stripPersonalData(event);
    expect(out.properties).toEqual({ route: '/u/[login]', $browser: 'Chrome' });
    expect(out.$set_once).toEqual({ outra: 'fica' });
    expect(out.$set).toEqual({});
    expect(out.event).toBe('page_viewed');
  });

  it('AC4: corta qualquer valor de texto no primeiro ?', () => {
    const out = stripPersonalData({
      properties: { origem: '/community?q=pato-teste', sem: 'nada-a-cortar', n: 3 },
    });
    expect(out.properties).toEqual({ origem: '/community', sem: 'nada-a-cortar', n: 3 });
  });

  it('AC4: não muda o evento de entrada', () => {
    const event = {
      properties: { $current_url: 'http://x/u/pato-teste', q: 'a?b' },
      $set_once: { $initial_pathname: '/u/pato-teste' },
    };
    const copy = structuredClone(event);
    stripPersonalData(event);
    expect(event).toEqual(copy);
  });

  it('AC4: para quaisquer propriedades, nada proibido sobrevive', () => {
    const key = fc.oneof(
      fc.constantFrom(...DENIED_PROPERTIES),
      fc
        .tuple(fc.constantFrom(...DENIED_PREFIXES), fc.string({ minLength: 1, maxLength: 12 }))
        .map(([prefix, s]) => `${prefix}${s}`),
      fc.string({ minLength: 1, maxLength: 12 })
    );
    const value = fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null));
    const bag = fc.dictionary(key, value);
    fc.assert(
      fc.property(bag, bag, bag, (properties, $set, $set_once) => {
        const out = stripPersonalData({ properties, $set, $set_once });
        for (const group of [out.properties, out.$set, out.$set_once]) {
          for (const [k, v] of Object.entries(group)) {
            expect(DENIED_PROPERTIES).not.toContain(k);
            expect(DENIED_PREFIXES.some((p) => k.startsWith(p))).toBe(false);
            if (typeof v === 'string') expect(v).not.toContain('?');
          }
        }
      }),
      { numRuns: 500 }
    );
  });
});

// ---------- AC5: a lista de eventos ----------

describe('WI-0025 — analyticsEvent', () => {
  it('AC5: os 9 eventos do ADR, por ordem', () => {
    expect(ANALYTICS_EVENTS).toEqual([
      'page_viewed',
      'auth_login_started',
      'auth_logout_requested',
      'account_deletion_requested',
      'passport_visibility_changed',
      'duck_reaction_changed',
      'tavern_lobby_membership_changed',
      'work_profile_saved',
      'work_profile_deleted',
    ]);
  });

  it.each<[string, Record<string, unknown> | undefined]>([
    ['page_viewed', { route: '/u/[login]' }],
    ['page_viewed', { route: '/other' }],
    ['auth_login_started', undefined],
    ['auth_logout_requested', {}],
    ['account_deletion_requested', undefined],
    ['passport_visibility_changed', { visibility: 'hidden' }],
    ['passport_visibility_changed', { visibility: 'visible' }],
    ['duck_reaction_changed', { action: 'give' }],
    ['duck_reaction_changed', { action: 'take' }],
    ['tavern_lobby_membership_changed', { action: 'join' }],
    ['tavern_lobby_membership_changed', { action: 'leave' }],
    ['work_profile_saved', undefined],
    ['work_profile_deleted', undefined],
  ])('AC5: %s com %j é aceite', (name, properties) => {
    expect(analyticsEvent(name, properties)).toEqual({ name, properties: properties ?? {} });
  });

  it.each<[string, Record<string, unknown> | undefined]>([
    ['$pageview', undefined],
    ['user_identified', undefined],
    ['page_viewed', undefined],
    ['page_viewed', { route: '/u/pato-teste' }],
    ['page_viewed', { route: '/u/[login]', login: 'pato-teste' }],
    ['auth_login_started', { login: 'pato-teste' }],
    ['passport_visibility_changed', { visibility: 'publico' }],
    ['duck_reaction_changed', { action: 'give', target: 'pato-teste' }],
    ['duck_reaction_changed', { action: 3 }],
    ['tavern_lobby_membership_changed', { action: 'join', slug: 'webserv' }],
  ])('AC5: %s com %j dá null', (name, properties) => {
    expect(analyticsEvent(name, properties)).toBeNull();
  });

  it('AC5: um nome fora da lista nunca passa', () => {
    fc.assert(
      fc.property(fc.string(), (name) => {
        fc.pre(!ANALYTICS_EVENTS.includes(name));
        expect(analyticsEvent(name)).toBeNull();
        expect(analyticsEvent(name, {})).toBeNull();
      })
    );
  });
});

// ---------- AC6: o padrão da rota ----------

describe('WI-0025 — routeTemplate', () => {
  it('AC6: as páginas conhecidas', () => {
    expect([...ROUTE_TEMPLATES].sort()).toEqual(
      [
        '/',
        '/account',
        '/calculator',
        '/community',
        '/login',
        '/pond',
        '/privacy',
        '/tavern',
        '/tavern/profile',
        '/tavern/[slug]',
        '/u/[login]',
      ].sort()
    );
  });

  it.each([
    ['/', '/'],
    ['/calculator', '/calculator'],
    ['/calculator?project=42cursus-libft&mark=100', '/calculator'],
    ['/community?q=pato-teste', '/community'],
    ['/community/', '/community'],
    ['/u/pato-teste', '/u/[login]'],
    ['/u/pato-teste?ref=x#topo', '/u/[login]'],
    ['/tavern/profile', '/tavern/profile'],
    ['/tavern/webserv', '/tavern/[slug]'],
    ['/u/pato-teste/extra', '/other'],
    ['/nao-existe', '/other'],
    ['/auth/callback?code=abc&state=def', '/other'],
  ])('AC6: %s → %s', (pathname, template) => {
    expect(routeTemplate(pathname)).toBe(template);
  });

  it('AC6: o login nunca sai do /u/[login], com qualquer login e query', () => {
    const login = fc.stringMatching(/^[a-z][a-z0-9-]{1,15}$/);
    fc.assert(
      fc.property(login, fc.string(), (l, query) => {
        const out = routeTemplate(`/u/${l}?${query}`);
        expect(out).toBe('/u/[login]');
        expect(ROUTE_TEMPLATES).toContain(out);
      })
    );
  });

  it('AC6: o resultado é sempre um padrão conhecido ou /other', () => {
    fc.assert(
      fc.property(fc.string(), (pathname) => {
        const out = routeTemplate(pathname);
        expect([...ROUTE_TEMPLATES, '/other']).toContain(out);
      }),
      { numRuns: 500 }
    );
  });
});

// ---------- AC8: o que não pode existir ----------

const ROOT = join(import.meta.dirname, '..', '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe('WI-0025 — sem identidade nem exportação de logs', () => {
  it('AC8: nenhuma dependência @opentelemetry', () => {
    const pkg = readFileSync(join(ROOT, 'package.json'), 'utf8');
    expect(pkg).not.toContain('@opentelemetry');
  });

  it('AC8: no src/, nenhum identify, alias, group nem register do PostHog, nem OpenTelemetry', () => {
    const offenders = sourceFiles(join(ROOT, 'src')).filter((file) => {
      const code = readFileSync(file, 'utf8');
      const usesPosthog = code.includes('posthog-js');
      return (
        code.includes('opentelemetry') ||
        (usesPosthog &&
          /\.(identify|alias|group|register|register_once|register_for_session)\s*\(/.test(code))
      );
    });
    expect(offenders).toEqual([]);
  });
});
