// tests/acceptance/e2e/wi-0011.e2e.ts
//
// Rascunho preparado pelo Claude a pedido do humano (2026-11-06). Revê antes do
// commit: depois de entrar, isto é o contrato. Usa as sessões do seed: pato
// (42cursus 5.179, projetos validados com 115 e 100), cisne (Alumni, nível 21,
// sem projetos), marreco (só Piscine, com um projeto validado) e pombo
// (42cursus abaixo do nível 5, só um projeto em curso: nenhuma badge).
import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import catalog from '../../../src/badges/catalog.json' with { type: 'json' };
import { en } from '../../../src/i18n/messages/en.js';
import seed from './seed-data.json' with { type: 'json' };

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

function badge(id: string): { name: string; description: string } {
  const entry = catalog.find((b) => b.id === id);
  if (entry === undefined) throw new Error(`catálogo sem a badge ${id}`);
  return entry;
}

const badgeList = (page: Page) => page.getByRole('list', { name: en.badges.title });

async function shownBadges(page: Page): Promise<string[]> {
  return badgeList(page).getByRole('listitem').allTextContents();
}

test('AC3: o próprio vê as suas badges, com nome e descrição', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('pato', context, baseURL);
  await page.goto('/');
  const items = await shownBadges(page);
  expect(items).toHaveLength(2);
  for (const [i, id] of ['first-validation', 'level-5'].entries()) {
    expect(items[i]).toContain(badge(id).name);
    expect(items[i]).toContain(badge(id).description);
  }
});

test('AC1: Alumni no nível 21, sem projetos, tem as badges certas', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('cisne', context, baseURL);
  await page.goto('/');
  const items = (await shownBadges(page)).join('\n');
  for (const id of ['level-5', 'level-10', 'level-15', 'level-21', 'alumni']) {
    expect(items).toContain(badge(id).name);
  }
  expect(items).not.toContain(badge('first-validation').name);
  expect(items).not.toContain(badge('max-mark').name);
});

test('AC1/AC4: só com um projeto em curso e nível baixo, sem badges e sem lista', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('pombo', context, baseURL);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'pombo-teste' })).toBeVisible();
  await expect(badgeList(page)).toHaveCount(0);
});

test('AC1: um projeto validado da Piscine conta para a primeira validação', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('marreco', context, baseURL);
  await page.goto('/');
  expect(await shownBadges(page)).toEqual([
    expect.stringContaining(badge('first-validation').name),
  ]);
});

test('AC3: o Passaporte público mostra as mesmas badges', async ({ context, page, baseURL }) => {
  await signInAs('marreco', context, baseURL);
  await page.goto('/u/pato-teste');
  const items = (await shownBadges(page)).join('\n');
  expect(items).toContain(badge('first-validation').name);
  expect(items).toContain(badge('level-5').name);
  expect(items).not.toContain(badge('max-mark').name);
});
