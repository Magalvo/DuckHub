// tests/acceptance/e2e/wi-0008.e2e.ts
//
// Rascunho preparado pelo Claude a pedido do humano (2026-11-05). Revê antes do
// commit: depois de entrar, isto é o contrato. Usa as sessões do seed do
// WI-0005 (seed.mjs + seed-data.json).
import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import { en } from '../../../src/i18n/messages/en.js';
import seed from './seed-data.json' with { type: 'json' };

async function openAs(
  key: string,
  context: BrowserContext,
  page: Page,
  baseURL: string | undefined
): Promise<void> {
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
  await page.goto('/');
}

const avatar = (page: Page) => page.getByRole('img', { name: en.passport.photoAlt });

for (const [key, initials, background, text] of [
  // coalition escura → letras brancas
  ['pato', 'PT', 'rgb(14, 18, 181)', 'rgb(255, 255, 255)'],
  // sem coalition → Cyber-Teal e letras pretas
  ['marreco', 'MT', 'rgb(0, 186, 188)', 'rgb(0, 0, 0)'],
  // coalition clara → letras pretas
  ['cisne', 'CT', 'rgb(255, 96, 0)', 'rgb(0, 0, 0)'],
] as const) {
  test(`AC1/AC2: ${key} vê ${initials} num círculo da cor de destaque`, async ({
    context,
    page,
    baseURL,
  }) => {
    await openAs(key, context, page, baseURL);
    await expect(avatar(page)).toBeVisible();
    await expect(avatar(page)).toHaveText(initials);
    await expect(avatar(page)).toHaveCSS('background-color', background);
    await expect(avatar(page).getByText(initials, { exact: true })).toHaveCSS('color', text);
  });
}

test('AC3: o Passaporte não tem nenhuma imagem da 42', async ({ context, page, baseURL }) => {
  await openAs('pato', context, page, baseURL);
  await expect(page.locator('main img')).toHaveCount(0);
  const html = await page.content();
  expect(html).not.toContain('cdn.intra.42.fr');
});
