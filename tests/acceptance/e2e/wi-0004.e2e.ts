// tests/acceptance/e2e/wi-0004.e2e.ts
//
// Rascunho preparado pelo Claude a pedido do humano (2026-11-04). Revê antes do
// commit: depois de entrar, isto é o contrato. Não faz login real: só o que um
// visitante sem sessão vê.
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { en } from '../../../src/i18n/messages/en.js';

test('AC1: sem sessão, qualquer página leva ao login com a 42', async ({ page }) => {
  for (const path of ['/', '/uma-pagina-qualquer']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login(\?.*)?$/);
  }
  await expect(page.getByRole('link', { name: en.login.signIn })).toHaveAttribute(
    'href',
    '/auth/login'
  );
});

test('AC3: campus recusado mostra a mensagem e deixa tentar de novo', async ({ page }) => {
  await page.goto('/login?error=campus');
  await expect(page.getByText(en.login.errors.campus)).toBeVisible();
  await expect(page.getByRole('link', { name: en.login.signIn })).toBeVisible();
});

test('AC6: erro da 42 mostra a mensagem e deixa tentar de novo', async ({ page }) => {
  await page.goto('/login?error=oauth');
  await expect(page.getByText(en.login.errors.oauth)).toBeVisible();
  await expect(page.getByRole('link', { name: en.login.signIn })).toHaveAttribute(
    'href',
    '/auth/login'
  );
});

test('AC8: a página de privacidade é pública e lista os dados e para que servem', async ({
  page,
}) => {
  const response = await page.goto('/privacy');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole('heading', { name: en.privacy.title })).toBeVisible();
  expect(en.privacy.items.length).toBeGreaterThan(0);
  for (const item of en.privacy.items) {
    await expect(page.getByText(item.data, { exact: true })).toBeVisible();
    await expect(page.getByText(item.purpose, { exact: true })).toBeVisible();
  }
});

for (const path of ['/login', '/login?error=oauth', '/privacy']) {
  test(`regra 12: ${path} sem violações de acessibilidade AA`, async ({ page }) => {
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(violations).toEqual([]);
  });
}
