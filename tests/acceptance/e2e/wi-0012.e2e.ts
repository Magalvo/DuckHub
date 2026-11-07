// tests/acceptance/e2e/wi-0012.e2e.ts
//
// Rascunho preparado pelo Claude a pedido do humano (2026-11-07). Revê antes do
// commit: depois de entrar, isto é o contrato. Usa os eventos do seed
// (pondEvents e um por pinguim). Para quem não é a garça, o feed tem 34
// eventos: pinguim-01 … pinguim-30 (1 a 30 minutos), pato (projeto e badge,
// 120 minutos), cisne (badge, 180) e pombo (nível, 200). O da garça (escondida,
// 60 minutos) só a própria o vê; o do marreco tem 100 dias e já expirou. A
// cegonha não tem eventos: o teste do WI-0009 muda-lhe a visibilidade.
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import catalog from '../../../src/badges/catalog.json' with { type: 'json' };
import { en } from '../../../src/i18n/messages/en.js';
import seed from './seed-data.json' with { type: 'json' };

const PAGE_SIZE = 20;
const pinguins = Array.from(
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

function badgeName(id: string): string {
  const entry = catalog.find((b) => b.id === id);
  if (entry === undefined) throw new Error(`catálogo sem a badge ${id}`);
  return entry.name;
}

const feed = (page: Page) => page.getByRole('list', { name: en.pond.listLabel });
const items = (page: Page) => feed(page).getByRole('listitem');

/** O login de cada evento, pela ordem do feed. */
async function logins(page: Page): Promise<string[]> {
  return items(page).getByRole('link').allTextContents();
}

/** Os logins das duas páginas do feed. */
async function allLogins(page: Page): Promise<string[]> {
  await page.goto('/pond');
  const first = await logins(page);
  await page.goto('/pond?page=2');
  return [...first, ...(await logins(page))];
}

test('a navegação leva ao Duck Pond', async ({ context, page, baseURL }) => {
  await signInAs('pato', context, baseURL);
  await page.goto('/');
  await page
    .getByRole('navigation')
    .first()
    .getByRole('link', { name: en.shell.items.pond })
    .click();
  await expect(page).toHaveURL(/\/pond$/);
});

test('AC4: do mais recente para o mais antigo, em páginas de 20', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('marreco', context, baseURL);
  await page.goto('/pond');
  expect(await logins(page)).toEqual(pinguins.slice(0, PAGE_SIZE));
  await expect(page.getByRole('link', { name: en.pond.previous })).toHaveCount(0);

  await page.getByRole('link', { name: en.pond.next }).click();
  await expect(page).toHaveURL(/page=2/);
  expect(await logins(page)).toEqual([
    ...pinguins.slice(PAGE_SIZE),
    'pato-teste',
    'pato-teste',
    'cisne-teste',
    'pombo-teste',
  ]);
  await expect(page.getByRole('link', { name: en.pond.next })).toHaveCount(0);
  await expect(page.getByRole('link', { name: en.pond.previous })).toBeVisible();
});

test('AC4: uma página inválida conta como a primeira', async ({ context, page, baseURL }) => {
  await signInAs('marreco', context, baseURL);
  await page.goto('/pond?page=abc');
  expect(await logins(page)).toEqual(pinguins.slice(0, PAGE_SIZE));
});

test('AC4: cada evento diz quem, o quê, e liga ao Passaporte público', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('marreco', context, baseURL);
  await page.goto('/pond?page=2');

  const project = items(page).filter({ hasText: 'Projeto Concluído' });
  await expect(project).toHaveCount(1);
  await expect(project).toContainText(en.pond.events.projectValidated);
  await expect(project).toContainText('115');
  await expect(project.getByRole('link', { name: 'pato-teste' })).toHaveAttribute(
    'href',
    '/u/pato-teste'
  );

  const firstValidation = items(page).filter({ hasText: badgeName('first-validation') });
  await expect(firstValidation).toHaveCount(1);
  await expect(firstValidation).toContainText(en.pond.events.badge);
  await expect(firstValidation).toContainText('pato-teste');

  const alumni = items(page).filter({ hasText: badgeName('alumni') });
  await expect(alumni).toContainText('cisne-teste');

  const level = items(page).filter({ hasText: 'pombo-teste' });
  await expect(level).toContainText(en.pond.events.levelUp);
  await expect(level).toContainText('2');
});

test('AC5: os eventos de quem se escondeu não aparecem a outras pessoas', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('marreco', context, baseURL);
  expect(await allLogins(page)).not.toContain('garca-teste');
  expect(await page.content()).not.toContain('Projeto da Garça');
});

test('decisão: quem se escondeu continua a ver os seus eventos', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('garca', context, baseURL);
  await page.goto('/pond?page=2');
  const own = items(page).filter({ hasText: 'Projeto da Garça' });
  await expect(own).toHaveCount(1);
  await expect(own).toContainText('garca-teste');
});

test('AC6: um evento com mais de 90 dias não aparece', async ({ context, page, baseURL }) => {
  // É do próprio marreco: se não tivesse expirado, ele via-o.
  await signInAs('marreco', context, baseURL);
  expect(await allLogins(page)).not.toContain('marreco-teste');
});

test('sem sessão, /pond leva ao login', async ({ page }) => {
  await page.goto('/pond');
  await expect(page).toHaveURL(/\/login(\?.*)?$/);
});

for (const path of ['/pond', '/pond?page=2']) {
  test(`AC8: ${path} sem violações de acessibilidade AA`, async ({ context, page, baseURL }) => {
    await signInAs('pato', context, baseURL);
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(violations).toEqual([]);
  });
}

test('AC8: os controlos do feed alcançam-se só com o teclado', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('pato', context, baseURL);
  await page.goto('/pond?page=2');
  // Os <input type="hidden"> dos formulários (WI-0013) nunca recebem foco.
  // A lista fica numa variável da página: não se mexe no HTML (ver wi-0005.e2e.ts).
  const total = await page.evaluate(() => {
    const focusable = [
      ...document.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"]), summary'
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
