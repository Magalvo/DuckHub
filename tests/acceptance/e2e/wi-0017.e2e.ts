// tests/acceptance/e2e/wi-0017.e2e.ts
//
// Rascunho preparado pelo Claude a pedido do humano (2026-11-07). Revê antes do
// commit: depois de entrar, isto é o contrato. Usa o lobby do minishell do
// seed: no campus 9001 estão o pardal, o melro e o tordo (com perfis de
// trabalho) e a gaivota (entrou há 15 dias: expirou); no campus 9003 estão o
// corvo e o estorninho. O pisco está à procura de grupo na Intra, sem perfil e
// fora do lobby; a rola tem o Passaporte escondido; o pato já acabou o
// minishell. Só o pisco entra e sai, e só o estorninho esconde o Passaporte:
// os outros testes não dependem deles.
import { AxeBuilder } from '@axe-core/playwright';
import {
  expect,
  test,
  type APIRequestContext,
  type BrowserContext,
  type Locator,
  type Page,
} from '@playwright/test';

import { en } from '../../../src/i18n/messages/en.js';
import seed from './seed-data.json' with { type: 'json' };

const TAVERN = '/tavern';
const MINISHELL = '42cursus-minishell';
const LOBBY = `${TAVERN}/${MINISHELL}`;
const ACTION = '/tavern/lobby';
const { lobby } = en.tavern;

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

const projects = (page: Page) => page.getByRole('list', { name: lobby.projectsLabel });
const projectItem = (page: Page, name: string): Locator =>
  projects(page).getByRole('listitem').filter({ hasText: name });
const members = (page: Page) => page.getByRole('list', { name: lobby.membersLabel });
const member = (page: Page, login: string): Locator =>
  members(page).getByRole('listitem').filter({ hasText: login });

async function memberLogins(page: Page): Promise<string[]> {
  return members(page)
    .getByRole('listitem')
    .getByRole('link')
    .allInnerTexts()
    .then((texts) => texts.map((t) => t.trim()));
}

function post(
  request: APIRequestContext,
  baseURL: string | undefined,
  form: Record<string, string>,
  origin: string = baseURL ?? 'http://localhost'
) {
  return request.post(ACTION, { form, headers: { origin }, maxRedirects: 0 });
}

test('sem sessão, a Tavern leva ao login', async ({ page }) => {
  await page.goto(TAVERN);
  await expect(page).toHaveURL(/\/login$/);
});

test('AC1/AC2: vê-se só os projetos de grupo em que se está inscrito, com a sugestão da Intra', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('pisco', context, baseURL);
  await page.goto(TAVERN);
  await expect(page.getByRole('heading', { level: 1, name: lobby.title })).toBeVisible();
  // A Libft está em curso, mas é a solo.
  await expect(projects(page).getByRole('listitem')).toHaveCount(1);
  const item = projectItem(page, 'minishell');
  await expect(item.getByText(lobby.suggested, { exact: true })).toBeVisible();
  // O botão de entrar verifica-se no teste AC5 (o pisco entra e sai lá).
  // Sem perfil de trabalho: entra na mesma, com um aviso que leva ao questionário.
  await expect(page.getByText(lobby.noProfile, { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: lobby.editProfile })).toHaveAttribute(
    'href',
    '/tavern/profile'
  );
});

test('AC1: um projeto já acabado não dá lobby', async ({ context, page, baseURL }) => {
  await signInAs('pato', context, baseURL);
  await page.goto(TAVERN);
  await expect(page.getByText(lobby.noProjects, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: lobby.join })).toHaveCount(0);
});

test('AC3/AC6: o lobby mostra quem está no mesmo lobby e campus, ordenado, com percentagem e razões', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('pardal', context, baseURL);
  await page.goto(LOBBY);
  await expect(page.getByRole('heading', { level: 1, name: 'minishell' })).toBeVisible();
  // O pisco pode estar a entrar e a sair noutro teste.
  const shown = (await memberLogins(page)).filter((l) => l !== 'pisco-teste');
  // Sem o próprio, sem a gaivota (expirou) e sem o corvo e o estorninho (outro campus).
  expect(shown).toEqual(['melro-teste', 'tordo-teste']);

  const melro = member(page, 'melro-teste');
  await expect(melro).toContainText('100%');
  for (const text of Object.values(en.tavern.reasons)) {
    await expect(melro.getByText(text, { exact: true })).toBeVisible();
  }
  await expect(melro.getByRole('link', { name: 'melro-teste' })).toHaveAttribute(
    'href',
    '/u/melro-teste'
  );

  const tordo = member(page, 'tordo-teste');
  await expect(tordo).toContainText('78%');
  await expect(tordo.getByText(en.tavern.reasons['shared-hours'], { exact: true })).toBeVisible();
  await expect(tordo.getByText(en.tavern.reasons['same-grade-goal'], { exact: true })).toHaveCount(
    0
  );
});

test('AC2/AC4: o lobby não mostra o estado na Intra de ninguém', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('pardal', context, baseURL);
  await page.goto(LOBBY);
  await expect(page.getByText(lobby.suggested)).toHaveCount(0);
});

test('AC4: quem não está no lobby não o vê', async ({ browser, baseURL }) => {
  for (const [key, path] of [
    ['pato', LOBBY], // acabou o projeto
    ['pisco', `${TAVERN}/webserv`], // não está inscrito
    ['gaivota', LOBBY], // a entrada expirou
    ['pardal', `${TAVERN}/projeto-que-nao-existe`],
  ] as const) {
    const context = await browser.newContext();
    await signInAs(key, context, baseURL);
    const page = await context.newPage();
    const res = await page.goto(path);
    expect(res?.status(), `${key} ${path}`).toBe(404);
    await context.close();
  }
});

test('AC5: entrar, ver o lobby e sair', async ({ context, page, baseURL }) => {
  await signInAs('pisco', context, baseURL);
  await page.goto(TAVERN);
  await projectItem(page, 'minishell').getByRole('button', { name: lobby.join }).click();
  await expect(page).toHaveURL(LOBBY);
  // Sem perfil de trabalho, ninguém tem nada em comum: 0%, por login.
  expect(await memberLogins(page)).toEqual(['melro-teste', 'pardal-teste', 'tordo-teste']);
  for (const login of ['melro-teste', 'pardal-teste', 'tordo-teste']) {
    await expect(member(page, login)).toContainText('0%');
  }

  await page.goto(TAVERN);
  const item = projectItem(page, 'minishell');
  await expect(item.getByRole('link', { name: lobby.open })).toHaveAttribute('href', LOBBY);
  await item.getByRole('button', { name: lobby.leave }).click();
  await expect(page).toHaveURL(TAVERN);
  await expect(
    projectItem(page, 'minishell').getByRole('button', { name: lobby.join })
  ).toBeVisible();
  expect((await page.goto(LOBBY))?.status()).toBe(404);
});

test('AC5: uma entrada expirada pode voltar a entrar', async ({ context, page, baseURL }) => {
  await signInAs('gaivota', context, baseURL);
  await page.goto(TAVERN);
  const item = projectItem(page, 'minishell');
  await expect(item.getByRole('button', { name: lobby.join })).toBeVisible();
  await expect(item.getByRole('link', { name: lobby.open })).toHaveCount(0);
});

test('AC8: com o Passaporte escondido não se entra', async ({ context, page, baseURL }) => {
  await signInAs('rola', context, baseURL);
  await page.goto(TAVERN);
  await expect(page.getByText(lobby.hiddenPassport, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: lobby.join })).toHaveCount(0);
  const res = await post(context.request, baseURL, { intent: 'join', project: MINISHELL });
  expect(res.status()).toBe(403);
});

test('AC8: esconder o Passaporte tira a pessoa do lobby', async ({ context, page, baseURL }) => {
  await signInAs('estorninho', context, baseURL);
  expect((await page.goto(LOBBY))?.status()).toBe(200);
  const hide = await context.request.post('/account/visibility', {
    form: { hidden: 'true' },
    headers: { origin: baseURL ?? 'http://localhost' },
    maxRedirects: 0,
  });
  expect(hide.status()).toBe(303);
  expect((await page.goto(LOBBY))?.status()).toBe(404);

  const show = await context.request.post('/account/visibility', {
    form: { hidden: 'false' },
    headers: { origin: baseURL ?? 'http://localhost' },
    maxRedirects: 0,
  });
  expect(show.status()).toBe(303);
  // Mostrar outra vez não devolve o lugar no lobby.
  await page.goto(TAVERN);
  await expect(
    projectItem(page, 'minishell').getByRole('button', { name: lobby.join })
  ).toBeVisible();
});

test('AC7: pedidos de outro site são recusados', async ({ context, baseURL }) => {
  await signInAs('pardal', context, baseURL);
  const res = await post(
    context.request,
    baseURL,
    { intent: 'leave', project: MINISHELL },
    'https://outro-site.example'
  );
  expect(res.status()).toBe(403);
});

test('AC7: sem sessão, entrar leva ao login', async ({ request, baseURL }) => {
  const res = await post(request, baseURL, { intent: 'join', project: MINISHELL });
  expect(res.status()).toBe(303);
  expect(new URL(res.headers().location ?? '', baseURL).pathname).toBe('/login');
});

test('AC1/AC7: só se entra em projetos de grupo em que se está inscrito', async ({
  context,
  baseURL,
}) => {
  await signInAs('pato', context, baseURL);
  for (const [form, status] of [
    [{ intent: 'join', project: MINISHELL }, 403], // acabou
    [{ intent: 'join', project: 'webserv' }, 403], // não está inscrito
    [{ intent: 'join', project: '42cursus-libft' }, 403], // a solo
    [{ intent: 'destroy', project: MINISHELL }, 400],
    [{ intent: 'join' }, 400],
    [{ intent: 'join', project: '../account' }, 400],
  ] as const) {
    const res = await post(context.request, baseURL, form);
    expect(res.status(), JSON.stringify(form)).toBe(status);
  }
});

test('AC7: o lobby funciona sem JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  await signInAs('pardal', context, baseURL);
  const page = await context.newPage();
  await page.goto(TAVERN);
  const forms = projectItem(page, 'minishell').locator(`form[method="post"][action="${ACTION}"]`);
  await expect(forms.locator(`input[name="project"][value="${MINISHELL}"]`).first()).toBeAttached();
  await expect(forms.getByRole('button', { name: lobby.leave })).toBeVisible();
  await context.close();
});

test('o menu leva à Tavern', async ({ context, page, baseURL }) => {
  await signInAs('pardal', context, baseURL);
  await page.goto('/');
  await page
    .getByRole('navigation')
    .first()
    .getByRole('link', { name: en.shell.items.tavern })
    .click();
  await expect(page).toHaveURL(TAVERN);
});

test('AC5: a página de privacidade lista as entradas nos lobbies', async ({ page }) => {
  const item = en.privacy.items.find((i) => /lobb/i.test(i.data));
  if (item === undefined) throw new Error('privacidade sem os lobbies');
  await page.goto('/privacy');
  await expect(page.getByText(item.data, { exact: true })).toBeVisible();
});

for (const path of [TAVERN, LOBBY]) {
  test(`${path} sem violações de acessibilidade AA`, async ({ context, page, baseURL }) => {
    await signInAs('pardal', context, baseURL);
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(violations).toEqual([]);
  });
}

test('os controlos do lobby alcançam-se só com o teclado', async ({ context, page, baseURL }) => {
  await signInAs('pardal', context, baseURL);
  await page.goto(TAVERN);
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
