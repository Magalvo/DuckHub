// tests/acceptance/e2e/wi-0009.e2e.ts
//
// Rascunho preparado pelo Claude a pedido do humano (2026-11-06). Revê antes do
// commit: depois de entrar, isto é o contrato. Usa as sessões do seed: garca
// tem o Passaporte escondido; cegonha só é usada no teste do botão, para não
// interferir com os outros testes.
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';

import { en } from '../../../src/i18n/messages/en.js';
import seed from './seed-data.json' with { type: 'json' };

function token(key: string): string {
  const user = seed.users.find((u) => u.key === key);
  if (user === undefined) throw new Error(`seed sem utilizador ${key}`);
  return user.sessionToken;
}

async function signInAs(key: string, context: BrowserContext, baseURL: string | undefined) {
  await context.addCookies([
    {
      name: 'dh_session',
      value: token(key),
      url: baseURL ?? 'http://localhost',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}

/** Uma página noutro browser (outra pessoa, outra sessão). */
async function pageAs(key: string, browser: Browser, baseURL: string | undefined): Promise<Page> {
  const context = await browser.newContext(baseURL === undefined ? {} : { baseURL });
  await signInAs(key, context, baseURL);
  return context.newPage();
}

test('AC1: vê o Passaporte público de outro membro', async ({ context, page, baseURL }) => {
  await signInAs('marreco', context, baseURL);
  const response = await page.goto('/u/pato-teste');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'pato-teste' })).toBeVisible();
  await expect(page.getByRole('img', { name: en.publicPassport.photoAlt })).toBeVisible();
  await expect(page.locator('main')).toContainText('5.17');
});

test('AC2: só os projetos validados, e os outros nem vão no HTML', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('marreco', context, baseURL);
  await page.goto('/u/pato-teste');
  const done = page.getByRole('listitem').filter({ hasText: 'Projeto Concluído' });
  await expect(done).toContainText('115');
  const html = await page.content();
  expect(html).not.toContain('Projeto Falhado');
  expect(html).not.toContain('Projeto Em Curso');
  expect(html).not.toContain('projeto-falhado');
  expect(html).not.toContain('projeto-em-curso');
});

test('AC3: sem a data da sincronização', async ({ context, page, baseURL }) => {
  await signInAs('marreco', context, baseURL);
  await page.goto('/u/pato-teste');
  const html = await page.content();
  expect(html).not.toContain('2026-07-15 14:05');
  await expect(page.locator('main')).not.toContainText(en.passport.syncedAt);
});

test('o teu /u/ mostra a vista pública, com a nota', async ({ context, page, baseURL }) => {
  await signInAs('pato', context, baseURL);
  await page.goto('/u/pato-teste');
  await expect(page.getByText(en.publicPassport.ownPreview, { exact: true })).toBeVisible();
  expect(await page.content()).not.toContain('Projeto Falhado');
});

test('AC4: esconder e voltar a mostrar o Passaporte em /account', async ({ browser, baseURL }) => {
  const cegonha = await pageAs('cegonha', browser, baseURL);
  const other = await pageAs('marreco', browser, baseURL);

  await cegonha.goto('/account');
  await expect(
    cegonha.getByText(en.account.visibility.visibleState, { exact: true })
  ).toBeVisible();
  await cegonha.getByRole('button', { name: en.account.visibility.hide }).click();
  await expect(cegonha).toHaveURL(/\/account$/);
  await expect(cegonha.getByText(en.account.visibility.hiddenState, { exact: true })).toBeVisible();
  expect((await other.goto('/u/cegonha-teste'))?.status()).toBe(404);

  await cegonha.getByRole('button', { name: en.account.visibility.show }).click();
  await expect(
    cegonha.getByText(en.account.visibility.visibleState, { exact: true })
  ).toBeVisible();
  expect((await other.goto('/u/cegonha-teste'))?.status()).toBe(200);
});

test('AC4: o pedido de outro site para esconder é recusado', async ({ context, baseURL }) => {
  await signInAs('cegonha', context, baseURL);
  const response = await context.request.post('/account/visibility', {
    form: { hidden: 'true' },
    headers: { origin: 'https://site-malicioso.example' },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(403);
});

test('AC5: escondido responde como inexistente a outras pessoas', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('marreco', context, baseURL);
  const hidden = await page.goto('/u/garca-teste');
  expect(hidden?.status()).toBe(404);
  await expect(page.getByText(en.publicPassport.notFound, { exact: true })).toBeVisible();
  const hiddenText = await page.locator('main').textContent();

  const missing = await page.goto('/u/login-que-nao-existe');
  expect(missing?.status()).toBe(404);
  expect(await page.locator('main').textContent()).toBe(hiddenText);
});

test('AC5: quem escondeu continua a ver o seu Passaporte em /, com o aviso', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('garca', context, baseURL);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'garca-teste' })).toBeVisible();
  await expect(page.getByText(en.passport.hiddenNotice, { exact: true })).toBeVisible();
  // O aviso liga a /account.
  await expect(page.locator('main a[href="/account"]').first()).toBeVisible();
});

test('AC6: sem Passaporte sincronizado responde como inexistente', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('marreco', context, baseURL);
  expect((await page.goto('/u/ganso-teste'))?.status()).toBe(404);
  await expect(page.getByText(en.publicPassport.notFound, { exact: true })).toBeVisible();
});

test('AC7: sem sessão, /u/<login> leva ao login', async ({ page }) => {
  await page.goto('/u/pato-teste');
  await expect(page).toHaveURL(/\/login(\?.*)?$/);
});

test('AC8: a página de privacidade explica a visibilidade', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByText(en.privacy.visibility, { exact: true })).toBeVisible();
});

for (const [key, path] of [
  ['marreco', '/u/pato-teste'],
  ['pato', '/u/pato-teste'],
  ['marreco', '/u/garca-teste'],
  ['cisne', '/account'],
] as const) {
  test(`AC9: ${path} de ${key} sem violações de acessibilidade AA`, async ({
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

test('AC9: os controlos do Passaporte público alcançam-se só com o teclado', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('marreco', context, baseURL);
  await page.goto('/u/pato-teste');
  // A lista fica numa variável da página: não se mexe no HTML (ver wi-0005.e2e.ts).
  const total = await page.evaluate(() => {
    const focusable = [
      ...document.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"]), summary'
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
