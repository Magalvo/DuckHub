// tests/acceptance/e2e/wi-0010.e2e.ts
//
// Rascunho preparado pelo Claude a pedido do humano (2026-11-06). Revê antes do
// commit: depois de entrar, isto é o contrato. Usa o seed: pato, marreco, cisne,
// cegonha e pombo (visíveis, campus 9001), garca (escondida), ganso (sem Passaporte)
// e pinguim-01 … pinguim-30 (visíveis, campus 9002). A cegonha pode estar
// escondida por momentos (teste do WI-0009 em paralelo): nenhum teste conta com
// o número exato de membros do campus 9001.
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import { en } from '../../../src/i18n/messages/en.js';
import seed from './seed-data.json' with { type: 'json' };

const PAGE_SIZE = 24;
const fillers = Array.from(
  { length: seed.directoryFillers.count },
  (_, i) => `${seed.directoryFillers.loginPrefix}-${String(i + 1).padStart(2, '0')}`
);

async function signInAs(key: string, context: BrowserContext, baseURL: string | undefined) {
  const user = seed.users.find((u) => u.key === key);
  if (user === undefined) throw new Error(`seed sem utilizador ${key}`);
  await context.addCookies([
    {
      name: 'dh_session',
      value: user.sessionToken,
      url: baseURL ?? 'http://localhost',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}

const list = (page: Page) => page.getByRole('list', { name: en.community.listLabel });

/** Os logins da página, pelos textos das ligações de cada membro. */
async function logins(page: Page): Promise<string[]> {
  return list(page).getByRole('listitem').getByRole('link').allTextContents();
}

test('a navegação leva ao diretório', async ({ context, page, baseURL }) => {
  await signInAs('pato', context, baseURL);
  await page.goto('/');
  await page
    .getByRole('navigation')
    .first()
    .getByRole('link', { name: en.shell.items.community })
    .click();
  await expect(page).toHaveURL(/\/community$/);
});

test('AC1: cada membro tem login, campus e nível, e liga ao Passaporte público', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('marreco', context, baseURL);
  await page.goto('/community?q=pato-teste');
  const item = list(page).getByRole('listitem').filter({ hasText: 'pato-teste' });
  await expect(item).toHaveCount(1);
  await expect(item).toContainText('Campus Sintético');
  await expect(item).toContainText('5.17');
  await expect(item.getByRole('link', { name: 'pato-teste' })).toHaveAttribute(
    'href',
    '/u/pato-teste'
  );
});

test('AC2: quem escondeu o Passaporte ou não o tem não aparece', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('pato', context, baseURL);
  const all: string[] = [];
  for (let p = 1; p <= 3; p += 1) {
    await page.goto(`/community?page=${String(p)}`);
    all.push(...(await logins(page)));
  }
  expect(all).not.toContain('garca-teste');
  expect(all).not.toContain('ganso-teste');
  for (const login of ['pato-teste', 'marreco-teste', 'cisne-teste', ...fillers]) {
    expect(all).toContain(login);
  }
});

test('AC3: filtrar por campus', async ({ context, page, baseURL }) => {
  await signInAs('pato', context, baseURL);
  await page.goto('/community');
  await page.getByLabel(en.community.campus).selectOption({ label: 'Campus Sintético B' });
  await page.getByLabel(en.community.search).press('Enter');
  await expect(page).toHaveURL(/campus=9002/);
  const shown = await logins(page);
  expect(shown).toHaveLength(PAGE_SIZE);
  expect(shown.every((l) => l.startsWith('pinguim-'))).toBe(true);
});

test('AC3: procurar por parte do login, sem distinguir maiúsculas', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('pato', context, baseURL);
  for (const q of ['arreco', 'MARRECO', 'Marre']) {
    await page.goto(`/community?q=${encodeURIComponent(q)}`);
    expect(await logins(page)).toEqual(['marreco-teste']);
  }
  // % e _ procuram-se como texto, não como padrões
  await page.goto(`/community?q=${encodeURIComponent('%')}`);
  await expect(page.getByText(en.community.empty, { exact: true })).toBeVisible();
});

test('AC4: A→Z, páginas de 24, sem repetidos, e as ligações mantêm o filtro', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('pato', context, baseURL);
  await page.goto('/community?campus=9002');
  const first = await logins(page);
  expect(first).toEqual(fillers.slice(0, PAGE_SIZE));
  await expect(page.getByRole('link', { name: en.community.previous })).toHaveCount(0);

  await page.getByRole('link', { name: en.community.next }).click();
  await expect(page).toHaveURL(/campus=9002/);
  await expect(page).toHaveURL(/page=2/);
  const second = await logins(page);
  expect(second).toEqual(fillers.slice(PAGE_SIZE));
  await expect(page.getByRole('link', { name: en.community.next })).toHaveCount(0);
  await expect(page.getByRole('link', { name: en.community.previous })).toBeVisible();

  // Estável: a mesma página dá a mesma lista.
  await page.reload();
  expect(await logins(page)).toEqual(second);
});

test('AC4: a lista de todos os campus vem ordenada A→Z', async ({ context, page, baseURL }) => {
  await signInAs('pato', context, baseURL);
  await page.goto('/community');
  const shown = await logins(page);
  expect(shown).toHaveLength(PAGE_SIZE);
  expect(shown).toEqual([...shown].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
});

test('AC4: uma página inválida conta como a primeira', async ({ context, page, baseURL }) => {
  await signInAs('pato', context, baseURL);
  await page.goto('/community?campus=9002&page=abc');
  expect(await logins(page)).toEqual(fillers.slice(0, PAGE_SIZE));
});

test('AC5: uma procura sem resultados mostra uma mensagem clara', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('pato', context, baseURL);
  await page.goto('/community?q=login-que-nao-existe');
  await expect(page.getByText(en.community.empty, { exact: true })).toBeVisible();
  await expect(list(page).getByRole('listitem')).toHaveCount(0);
});

for (const path of ['/community', '/community?campus=9002&page=2', '/community?q=zzz']) {
  test(`AC6: ${path} sem violações de acessibilidade AA`, async ({ context, page, baseURL }) => {
    await signInAs('pato', context, baseURL);
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(violations).toEqual([]);
  });
}

test('AC6: procurar só com o teclado', async ({ context, page, baseURL }) => {
  await signInAs('pato', context, baseURL);
  await page.goto('/community');
  await page.getByLabel(en.community.search).focus();
  await page.keyboard.type('cisne');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/q=cisne/);
  expect(await logins(page)).toEqual(['cisne-teste']);
});
