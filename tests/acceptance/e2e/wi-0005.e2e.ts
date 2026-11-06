// tests/acceptance/e2e/wi-0005.e2e.ts
//
// Rascunho preparado pelo Claude a pedido do humano (2026-11-04). Revê antes do
// commit: depois de entrar, isto é o contrato. As sessões vêm do seed
// (seed.mjs + seed-data.json): o browser só recebe o cookie de um utilizador
// sintético. Não há login real nem rede.
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import { en } from '../../../src/i18n/messages/en.js';
import seed from './seed-data.json' with { type: 'json' };

type Key = 'pato' | 'marreco' | 'cisne' | 'ganso';

// O teste de teclado (AC9) guarda a lista dos elementos focáveis numa variável
// da página, sem mexer no HTML: marcar os elementos com atributos antes de o
// React hidratar dava um aviso de hydration mismatch intermitente, que mudava
// a saída do make check de corrida para corrida.
declare global {
  interface Window {
    duckHubFocusable?: HTMLElement[];
  }
}

function token(key: Key): string {
  const user = seed.users.find((u) => u.key === key);
  if (user === undefined) throw new Error(`seed sem utilizador ${key}`);
  return user.sessionToken;
}

async function openAs(
  key: Key,
  context: BrowserContext,
  page: Page,
  baseURL: string | undefined,
  path = '/'
): Promise<void> {
  await context.addCookies([
    {
      name: 'dh_session',
      value: token(key),
      url: baseURL ?? 'http://localhost',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  await page.goto(path);
}

const passport = (page: Page) => page.locator('main section').first();

test('AC1: mostra login, avatar, campus, Piscine, coalition e nível', async ({
  context,
  page,
  baseURL,
}) => {
  await openAs('pato', context, page, baseURL);
  await expect(page.getByRole('heading', { name: 'pato-teste' })).toBeVisible();
  await expect(page.getByRole('img', { name: en.passport.photoAlt })).toBeVisible();
  const main = page.locator('main');
  for (const text of ['Campus Sintético', 'september', '2023', 'Os Patos', '42cursus', '5.17']) {
    await expect(main).toContainText(text);
  }
  await expect(main).not.toContainText('5.18');
});

test('AC2: a distinção Alumni só aparece a quem é Alumni', async ({ context, page, baseURL }) => {
  await openAs('cisne', context, page, baseURL);
  await expect(page.getByText(en.passport.alumni, { exact: true })).toBeVisible();
  await page.context().clearCookies();
  await openAs('pato', context, page, baseURL);
  await expect(page.getByText(en.passport.alumni, { exact: true })).toHaveCount(0);
});

test('AC3: só com a Piscine, o Passaporte é reduzido', async ({ context, page, baseURL }) => {
  await openAs('marreco', context, page, baseURL);
  const main = page.locator('main');
  await expect(page.getByText(en.passport.reduced, { exact: true })).toBeVisible();
  await expect(main).toContainText('C Piscine');
  await expect(main).toContainText('8.42');
  await expect(main).toContainText('Piscine Sintética 00');
  await expect(main).not.toContainText('42cursus');
});

test('AC4: o acento é a cor da coalition e, sem coalition, o Cyber-Teal', async ({
  context,
  page,
  baseURL,
}) => {
  const accent = () =>
    passport(page).evaluate((el) => getComputedStyle(el).getPropertyValue('--accent').trim());
  await openAs('pato', context, page, baseURL);
  expect((await accent()).toUpperCase()).toBe('#0E12B5');
  await page.context().clearCookies();
  await openAs('marreco', context, page, baseURL);
  expect((await accent()).toUpperCase()).toBe('#00BABC');
});

test('AC5: concluído com nota, falhado e em curso distinguem-se', async ({
  context,
  page,
  baseURL,
}) => {
  await openAs('pato', context, page, baseURL);
  const item = (name: string) => page.getByRole('listitem').filter({ hasText: name });
  await expect(item('Projeto Concluído')).toContainText(en.passport.states.done);
  await expect(item('Projeto Concluído')).toContainText('115');
  await expect(item('Projeto Falhado')).toContainText(en.passport.states.failed);
  await expect(item('Projeto Em Curso')).toContainText(en.passport.states.inProgress);
});

test('AC6: mostra a data e hora da última sincronização, em Lisboa', async ({
  context,
  page,
  baseURL,
}) => {
  await openAs('pato', context, page, baseURL);
  await expect(page.locator('main')).toContainText(en.passport.syncedAt);
  await expect(page.locator('main')).toContainText('2026-07-15 14:05');
});

test('AC6: sem sincronização ainda, diz que não sincronizou', async ({
  context,
  page,
  baseURL,
}) => {
  await openAs('ganso', context, page, baseURL);
  await expect(page.getByText(en.passport.notSynced, { exact: true })).toBeVisible();
});

test('AC7: cada utilizador só vê o seu Passaporte', async ({ context, page, baseURL }) => {
  await openAs('pato', context, page, baseURL);
  const main = page.locator('main');
  await expect(main).toContainText('pato-teste');
  for (const other of ['marreco-teste', 'cisne-teste', 'ganso-teste']) {
    await expect(main).not.toContainText(other);
  }
  await page.context().clearCookies();
  await openAs('marreco', context, page, baseURL);
  await expect(main).toContainText('marreco-teste');
  await expect(main).not.toContainText('pato-teste');
});

test('AC8: a página não mostra presença no campus', async ({ context, page, baseURL }) => {
  await openAs('pato', context, page, baseURL);
  const text = ((await page.locator('body').textContent()) ?? '').toLowerCase();
  for (const forbidden of ['location', 'logtime', 'black hole', 'blackhole']) {
    expect(text).not.toContain(forbidden);
  }
});

for (const [key, path] of [
  ['pato', '/'],
  ['marreco', '/'],
  ['cisne', '/'],
  ['ganso', '/'],
  ['pato', '/account'],
] as const) {
  test(`AC9: ${path} de ${key} sem violações de acessibilidade AA`, async ({
    context,
    page,
    baseURL,
  }) => {
    await openAs(key, context, page, baseURL, path);
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(violations).toEqual([]);
  });
}

test('AC9: todos os controlos do Passaporte se alcançam só com o teclado', async ({
  context,
  page,
  baseURL,
}) => {
  await openAs('pato', context, page, baseURL);
  const total = await page.evaluate(() => {
    const focusable = [
      ...document.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
      ),
    ];
    window.duckHubFocusable = focusable;
    return focusable.length;
  });
  expect(total).toBeGreaterThan(0);
  const reached = new Set<number>();
  for (let i = 0; i < total + 3; i += 1) {
    await page.keyboard.press('Tab');
    const index = await page.evaluate(() => {
      const active = document.activeElement;
      const list = window.duckHubFocusable ?? [];
      return active instanceof HTMLElement ? list.indexOf(active) : -1;
    });
    if (index !== -1) reached.add(index);
  }
  expect(reached.size).toBe(total);
});
