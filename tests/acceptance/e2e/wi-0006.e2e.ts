// tests/acceptance/e2e/wi-0006.e2e.ts
//
// Rascunho preparado pelo Claude a pedido do humano (2026-11-05). Revê antes do
// commit: depois de entrar, isto é o contrato. Usa as sessões do seed do
// WI-0005: o pato tem um projeto minishell (slug real) e projetos sintéticos.
import { expect, test } from '@playwright/test';

import { en } from '../../../src/i18n/messages/en.js';
import table from '../../../src/passport/real-world.json' with { type: 'json' };
import seed from './seed-data.json' with { type: 'json' };

test.beforeEach(async ({ context, page, baseURL }) => {
  const pato = seed.users.find((u) => u.key === 'pato');
  if (pato === undefined) throw new Error('seed sem o pato');
  await context.addCookies([
    {
      name: 'dh_session',
      value: pato.sessionToken,
      url: baseURL ?? 'http://localhost',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  await page.goto('/');
});

test('AC1: o minishell mostra o título e, ao abrir, a descrição', async ({ page }) => {
  const entry = table.find((e) => e.slugs.includes('42cursus-minishell'));
  if (entry === undefined) throw new Error('a tabela não tem o minishell');
  const item = page.getByRole('listitem').filter({ hasText: 'minishell' });
  await expect(item).toContainText(entry.title);

  const about = item.getByText(en.passport.aboutProject, { exact: true });
  await expect(item.getByText(entry.description, { exact: true })).toBeHidden();
  // Só com o teclado: foco no resumo e Enter.
  await about.focus();
  await page.keyboard.press('Enter');
  await expect(item.getByText(entry.description, { exact: true })).toBeVisible();
});

test('AC2: um projeto sem tradução mostra só o nome', async ({ page }) => {
  const item = page.getByRole('listitem').filter({ hasText: 'Projeto Concluído' });
  await expect(item).toBeVisible();
  await expect(item.getByText(en.passport.aboutProject, { exact: true })).toHaveCount(0);
  await expect(item.locator('details')).toHaveCount(0);
});
