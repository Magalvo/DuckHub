// tests/acceptance/e2e/wi-0007.e2e.ts
//
// Rascunho preparado pelo Claude a pedido do humano (2026-11-06). Revê antes do
// commit: depois de entrar, isto é o contrato. Usa as sessões do seed do
// WI-0005 e a cache de XP que o seed enche (fetched_at = agora): a página nunca
// chama a 42 real.
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';

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

const result = (page: Page) => page.locator('main');

test('a navegação leva à calculadora', async ({ context, page, baseURL }) => {
  await signInAs('pato', context, baseURL);
  await page.goto('/');
  await page
    .getByRole('navigation')
    .first()
    .getByRole('link', { name: en.shell.items.xpCalculator })
    .click();
  await expect(page).toHaveURL(/\/calculator$/);
  await expect(page.getByRole('heading', { name: en.calculator.title })).toBeVisible();
});

test('AC1, AC4, AC5: minishell com nota 100, submetido com Enter, dá 2814 XP', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('pato', context, baseURL);
  await page.goto('/calculator');
  await page.getByLabel(en.calculator.project).selectOption({ label: 'minishell' });
  await page.getByLabel(en.calculator.mark).fill('100');
  await page.getByLabel(en.calculator.mark).press('Enter');
  await expect(page).toHaveURL(/project=42cursus-minishell/);
  await expect(result(page)).toContainText(en.calculator.gained);
  await expect(result(page)).toContainText('2814');
  // AC4: a origem do valor
  await expect(result(page)).toContainText(en.calculator.source);
  // AC5: o nível real atual do Passaporte (5.179 → 5.17)
  await expect(result(page)).toContainText(en.calculator.currentLevel);
  await expect(result(page)).toContainText('5.17');
});

test('AC2: nota 125 dá 3517 XP no minishell', async ({ context, page, baseURL }) => {
  await signInAs('pato', context, baseURL);
  await page.goto('/calculator?project=42cursus-minishell&mark=125');
  await expect(result(page)).toContainText('3517');
});

for (const [mark, message] of [
  ['126', 'outOfRange'],
  ['-1', 'outOfRange'],
  ['99.5', 'notInteger'],
] as const) {
  test(`AC3: a nota ${mark} é rejeitada com uma mensagem clara`, async ({
    context,
    page,
    baseURL,
  }) => {
    await signInAs('pato', context, baseURL);
    await page.goto(`/calculator?project=42cursus-libft&mark=${encodeURIComponent(mark)}`);
    await expect(page.getByText(en.calculator.errors[message], { exact: true })).toBeVisible();
    await expect(result(page)).not.toContainText(en.calculator.gained);
  });
}

test('AC6: não mostra estimativa de nível novo nem XP em falta', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('pato', context, baseURL);
  await page.goto('/calculator?project=42cursus-libft&mark=100');
  const text = ((await result(page).textContent()) ?? '').toLowerCase();
  for (const forbidden of ['next level', 'new level', 'to level', 'remaining', 'missing']) {
    expect(text).not.toContain(forbidden);
  }
});

for (const key of ['marreco', 'ganso']) {
  test(`AC7: ${key} (só Piscine ou sem Passaporte) vê que ainda não está disponível`, async ({
    context,
    page,
    baseURL,
  }) => {
    await signInAs(key, context, baseURL);
    await page.goto('/calculator?project=42cursus-libft&mark=100');
    await expect(page.getByText(en.calculator.unavailable, { exact: true })).toBeVisible();
    await expect(page.getByLabel(en.calculator.project)).toHaveCount(0);
    await expect(result(page)).not.toContainText(en.calculator.gained);
  });
}

for (const [key, path] of [
  ['pato', '/calculator'],
  ['pato', '/calculator?project=42cursus-minishell&mark=100'],
  ['pato', '/calculator?project=42cursus-minishell&mark=126'],
  ['marreco', '/calculator'],
] as const) {
  test(`regra 12: ${path} de ${key} sem violações de acessibilidade AA`, async ({
    context,
    page,
    baseURL,
  }) => {
    await signInAs(key, context, baseURL);
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(violations).toEqual([]);
  });
}
