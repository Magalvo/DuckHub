// tests/acceptance/e2e/wi-0024.e2e.ts
//
// Rascunho preparado pelo Claude a pedido do humano (2026-11-09). Revê antes do
// commit: depois de entrar, isto é o contrato. Usa a pega (campus 9003, com o
// 42cursus e sem lobby): a cache desse campus no seed já tem os dois slugs do
// cub3d (42cursus-cub3d e cub3d, 2109 XP cada), por isso o seed não muda.
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type BrowserContext } from '@playwright/test';

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

test('AC1: a lista de projetos tem um só cub3d, com o primeiro slug do grupo', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('pega', context, baseURL);
  await page.goto('/calculator');
  const select = page.getByLabel(en.calculator.project);
  await expect(select.locator('option', { hasText: /^cub3d$/ })).toHaveCount(1);
  await expect(select.locator('option[value="42cursus-cub3d"]')).toHaveCount(1);
  await expect(select.locator('option[value="cub3d"]')).toHaveCount(0);
  // AC2: os outros continuam lá
  await expect(select.locator('option[value="42cursus-libft"]')).toHaveCount(1);
});

test('AC3: um link com o slug antigo calcula e seleciona o cub3d', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('pega', context, baseURL);
  await page.goto('/calculator?project=cub3d&mark=100');
  await expect(page.getByLabel(en.calculator.project)).toHaveValue('42cursus-cub3d');
  await expect(page.locator('main')).toContainText(en.calculator.gained);
  await expect(page.locator('main')).toContainText('2109');
  await expect(page.getByText(en.calculator.errors.unknownProject, { exact: true })).toHaveCount(0);
});

test('AC4: um slug fora da cache continua a dar unknownProject', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('pega', context, baseURL);
  await page.goto('/calculator?project=minirt&mark=100');
  await expect(page.getByText(en.calculator.errors.unknownProject, { exact: true })).toBeVisible();
  await expect(page.locator('main')).not.toContainText(en.calculator.gained);
});

test('regra 12: /calculator?project=cub3d&mark=100 sem violações de acessibilidade AA', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('pega', context, baseURL);
  await page.goto('/calculator?project=cub3d&mark=100');
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(violations).toEqual([]);
});
