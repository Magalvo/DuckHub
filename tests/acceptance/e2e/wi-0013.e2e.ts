// tests/acceptance/e2e/wi-0013.e2e.ts
//
// Rascunho preparado pelo Claude a pedido do humano (2026-11-07). Revê antes do
// commit: depois de entrar, isto é o contrato. Usa os Ducks do seed: o projeto
// do pato tem 2 (do cisne e do pombo), a badge do cisne tem 1 (da garça, que
// está escondida mas pode dar Ducks), a badge e o nível do pombo começam sem
// nenhum. Todos estes eventos estão na página 2 do feed. Só a cegonha muda
// Ducks, e só na badge do pato e no nível do pombo, que nenhum outro teste conta.
import { AxeBuilder } from '@axe-core/playwright';
import {
  expect,
  test,
  type APIRequestContext,
  type BrowserContext,
  type Locator,
  type Page,
} from '@playwright/test';

import catalog from '../../../src/badges/catalog.json' with { type: 'json' };
import { en } from '../../../src/i18n/messages/en.js';
import seed from './seed-data.json' with { type: 'json' };

const PAGE = '/pond?page=2';

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

function badgeName(id: string): string {
  const entry = catalog.find((b) => b.id === id);
  if (entry === undefined) throw new Error(`catálogo sem a badge ${id}`);
  return entry.name;
}

const ducks = (n: number): string =>
  `${String(n)} ${n === 1 ? en.pond.ducks.countOne : en.pond.ducks.countMany}`;

const feed = (page: Page) => page.getByRole('list', { name: en.pond.listLabel });
const item = (page: Page, text: string): Locator =>
  feed(page).getByRole('listitem').filter({ hasText: text });
const duckButton = (entry: Locator): Locator =>
  entry.getByRole('button', { name: en.pond.ducks.button });

/** O id de um evento, tirado do formulário que a página mostra a quem pode dar Ducks. */
async function eventId(entry: Locator): Promise<string> {
  const id = await entry.locator('input[name="event"]').getAttribute('value');
  if (id === null) throw new Error('evento sem id no formulário');
  return id;
}

function postDuck(
  request: APIRequestContext,
  form: Record<string, string>,
  headers: Record<string, string> = {}
) {
  return request.post('/pond/ducks', { form, headers, maxRedirects: 0 });
}

test('AC1/AC6: cada evento mostra a contagem e o estado do botão', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('marreco', context, baseURL);
  await page.goto(PAGE);
  const project = item(page, 'Projeto Concluído');
  await expect(project).toContainText(ducks(2));
  await expect(duckButton(project)).toHaveAttribute('aria-pressed', 'false');
  // O Duck da garça conta, apesar de ela estar escondida.
  await expect(item(page, badgeName('alumni'))).toContainText(ducks(1));
  // O nível do pombo (0 Ducks) não se verifica aqui: a cegonha muda-o noutro
  // teste, que pode correr em paralelo fora do CI.
});

test('AC6: quem já deu o Duck vê o botão premido', async ({ context, page, baseURL }) => {
  await signInAs('cisne', context, baseURL);
  await page.goto(PAGE);
  await expect(duckButton(item(page, 'Projeto Concluído'))).toHaveAttribute('aria-pressed', 'true');
});

test('decisão: nos eventos do próprio há contagem mas não há botão', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('pato', context, baseURL);
  await page.goto(PAGE);
  const own = item(page, 'Projeto Concluído');
  await expect(own).toContainText(ducks(2));
  await expect(own.getByRole('button')).toHaveCount(0);
});

test('AC1/AC4: dar e retirar um Duck sem JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    ...(baseURL === undefined ? {} : { baseURL }),
  });
  await signInAs('cegonha', context, baseURL);
  const page = await context.newPage();
  await page.goto(PAGE);

  const level = () => item(page, 'pombo-teste');
  await expect(level()).toContainText(ducks(0));
  await duckButton(level()).click();
  await expect(page).toHaveURL(/\/pond\?page=2/);
  await expect(level()).toContainText(ducks(1));
  await expect(duckButton(level())).toHaveAttribute('aria-pressed', 'true');

  await duckButton(level()).click();
  await expect(level()).toContainText(ducks(0));
  await expect(duckButton(level())).toHaveAttribute('aria-pressed', 'false');
  await context.close();
});

test('AC2: pedidos repetidos e simultâneos contam um só Duck', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('cegonha', context, baseURL);
  await page.goto(PAGE);
  const badge = () => item(page, badgeName('first-validation'));
  const event = await eventId(badge());
  const give = { event, duck: 'give', page: '2' };

  const responses = await Promise.all([
    postDuck(context.request, give),
    postDuck(context.request, give),
    postDuck(context.request, give),
  ]);
  for (const r of responses) expect(r.status()).toBe(303);
  await page.reload();
  await expect(badge()).toContainText(ducks(1));

  // Retirar duas vezes também não passa abaixo de zero.
  const take = { event, duck: 'take', page: '2' };
  expect((await postDuck(context.request, take)).status()).toBe(303);
  expect((await postDuck(context.request, take)).status()).toBe(303);
  await page.reload();
  await expect(badge()).toContainText(ducks(0));
});

test('AC4: um pedido de outro site é recusado', async ({ context, page, baseURL }) => {
  await signInAs('marreco', context, baseURL);
  await page.goto(PAGE);
  const event = await eventId(item(page, 'Projeto Concluído'));
  const response = await postDuck(
    context.request,
    { event, duck: 'give', page: '2' },
    { origin: 'https://site-malicioso.example' }
  );
  expect(response.status()).toBe(403);
  await page.reload();
  await expect(item(page, 'Projeto Concluído')).toContainText(ducks(2));
});

test('decisão: o servidor recusa um Duck a um evento do próprio', async ({
  browser,
  context,
  page,
  baseURL,
}) => {
  // O id vem da página do marreco; quem tenta é o próprio pato.
  await signInAs('marreco', context, baseURL);
  await page.goto(PAGE);
  const event = await eventId(item(page, 'Projeto Concluído'));

  const patoContext = await browser.newContext(baseURL === undefined ? {} : { baseURL });
  await signInAs('pato', patoContext, baseURL);
  const response = await postDuck(patoContext.request, { event, duck: 'give', page: '2' });
  expect(response.status()).toBe(403);
  await patoContext.close();

  await page.reload();
  await expect(item(page, 'Projeto Concluído')).toContainText(ducks(2));
});

test('AC4: campos inválidos dão 400', async ({ context, page, baseURL }) => {
  await signInAs('marreco', context, baseURL);
  await page.goto(PAGE);
  const event = await eventId(item(page, 'Projeto Concluído'));
  for (const form of [{ event, duck: 'maybe' }, { event: 'abc', duck: 'give' }, { duck: 'give' }]) {
    expect((await postDuck(context.request, form)).status()).toBe(400);
  }
});

test('um evento que não existe dá 404', async ({ context, baseURL }) => {
  await signInAs('marreco', context, baseURL);
  const response = await postDuck(context.request, { event: '999999999', duck: 'give' });
  expect(response.status()).toBe(404);
});

test('sem sessão, dar um Duck leva ao login', async ({ request }) => {
  // Quem responde pode ser o proxy (como em todas as rotas protegidas) ou o
  // handler: o contrato só fixa que é um redirecionamento para o login.
  const response = await postDuck(request, { event: '1', duck: 'give' });
  expect([302, 303, 307]).toContain(response.status());
  expect(response.headers().location).toMatch(/\/login(\?.*)?$/);
});

for (const key of ['marreco', 'cisne', 'pato']) {
  test(`AC6: ${PAGE} de ${key} sem violações de acessibilidade AA`, async ({
    context,
    page,
    baseURL,
  }) => {
    await signInAs(key, context, baseURL);
    await page.goto(PAGE);
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(violations).toEqual([]);
  });
}
