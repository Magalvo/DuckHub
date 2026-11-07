// tests/acceptance/e2e/wi-0015.e2e.ts
//
// Rascunho preparado pelo Claude a pedido do humano (2026-11-07). Revê antes do
// commit: depois de entrar, isto é o contrato. O seed não traz perfis de
// trabalho: cada teste que guarda respostas usa uma pessoa só sua (pato,
// cisne, cegonha, pombo, marreco), e o perfil não aparece em mais nenhuma
// página, por isso não mexe nos outros testes. O ganso e a garça só leem.
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

const PAGE = '/tavern/profile';
const ACTION = '/tavern/profile/answers';
const { profile } = en.tavern;
const { questions } = profile;

type Single = 'start' | 'gradeGoal' | 'pace' | 'style' | 'setting' | 'role';
const SINGLE: readonly Single[] = ['start', 'gradeGoal', 'pace', 'style', 'setting', 'role'];

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

const group = (page: Page, key: keyof typeof questions): Locator =>
  page.getByRole('group', { name: questions[key].label });

function radio<K extends Single>(
  page: Page,
  key: K,
  value: keyof (typeof questions)[K]['options'] | null
): Locator {
  const options: Record<string, string> = questions[key].options;
  const name = value === null ? profile.skip : options[String(value)];
  if (name === undefined) throw new Error(`sem opção ${String(value)} em ${key}`);
  return group(page, key).getByRole('radio', { name, exact: true });
}

const period = (page: Page, value: keyof typeof questions.periods.options): Locator =>
  group(page, 'periods').getByRole('checkbox', {
    name: questions.periods.options[value],
    exact: true,
  });

const saveButton = (page: Page) => page.getByRole('button', { name: profile.save, exact: true });
const deleteButton = (page: Page) =>
  page.getByRole('button', { name: profile.delete, exact: true });

async function expectEmpty(page: Page) {
  for (const key of SINGLE) await expect(radio(page, key, null)).toBeChecked();
  for (const box of await group(page, 'periods').getByRole('checkbox').all()) {
    await expect(box).not.toBeChecked();
  }
  await expect(deleteButton(page)).toHaveCount(0);
}

function post(
  request: APIRequestContext,
  baseURL: string | undefined,
  form: Record<string, string>,
  origin: string = baseURL ?? 'http://localhost'
) {
  return request.post(ACTION, { form, headers: { origin }, maxRedirects: 0 });
}

test('sem sessão, o questionário leva ao login', async ({ page }) => {
  await page.goto(PAGE);
  await expect(page).toHaveURL(/\/login$/);
});

test('o menu tem a Tavern, que leva ao questionário', async ({ context, page, baseURL }) => {
  await signInAs('ganso', context, baseURL);
  await page.goto('/');
  await page
    .getByRole('navigation')
    .first()
    .getByRole('link', { name: en.shell.items.tavern })
    .click();
  await expect(page).toHaveURL(PAGE);
  await expect(page.getByRole('heading', { level: 1, name: profile.title })).toBeVisible();
});

test('AC1/AC6: sem perfil, todas as perguntas começam sem resposta e a página explica quem vê o quê', async ({
  context,
  page,
  baseURL,
}) => {
  // O ganso nem tem Passaporte sincronizado: qualquer pessoa com sessão responde.
  await signInAs('ganso', context, baseURL);
  await page.goto(PAGE);
  for (const key of Object.keys(questions) as (keyof typeof questions)[]) {
    await expect(group(page, key)).toBeVisible();
  }
  await expectEmpty(page);
  await expect(page.getByText(profile.privacy, { exact: true })).toBeVisible();
  await expect(page.locator('textarea, input[type="text"]')).toHaveCount(0);
});

test('AC2: responder, guardar, voltar e mudar uma resposta para "não responder"', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('pato', context, baseURL);
  await page.goto(PAGE);
  await period(page, 'evening').check();
  await period(page, 'night').check();
  await radio(page, 'start', 'this-week').check();
  await radio(page, 'gradeGoal', 'max').check();
  await radio(page, 'pace', 'steady').check();
  await radio(page, 'style', 'pair').check();
  await radio(page, 'setting', 'hybrid').check();
  await radio(page, 'role', 'either').check();
  await saveButton(page).click();

  await expect(page).toHaveURL(`${PAGE}?saved=1`);
  await expect(page.getByRole('status')).toHaveText(profile.saved);

  await page.goto(PAGE);
  await expect(period(page, 'evening')).toBeChecked();
  await expect(period(page, 'night')).toBeChecked();
  await expect(period(page, 'morning')).not.toBeChecked();
  await expect(radio(page, 'start', 'this-week')).toBeChecked();
  await expect(radio(page, 'gradeGoal', 'max')).toBeChecked();
  await expect(radio(page, 'pace', 'steady')).toBeChecked();
  await expect(radio(page, 'style', 'pair')).toBeChecked();
  await expect(radio(page, 'setting', 'hybrid')).toBeChecked();
  await expect(radio(page, 'role', 'either')).toBeChecked();
  await expect(deleteButton(page)).toBeVisible();

  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(violations).toEqual([]);

  await radio(page, 'pace', null).check();
  await period(page, 'night').uncheck();
  await saveButton(page).click();
  await expect(page).toHaveURL(`${PAGE}?saved=1`);
  await page.goto(PAGE);
  await expect(radio(page, 'pace', null)).toBeChecked();
  await expect(period(page, 'night')).not.toBeChecked();
  await expect(period(page, 'evening')).toBeChecked();
  await expect(radio(page, 'role', 'either')).toBeChecked();
});

test('AC2: apagar o perfil de trabalho', async ({ context, page, baseURL }) => {
  await signInAs('cisne', context, baseURL);
  await page.goto(PAGE);
  await radio(page, 'role', 'lead').check();
  await saveButton(page).click();
  await expect(page).toHaveURL(`${PAGE}?saved=1`);

  await deleteButton(page).click();
  await expect(page).toHaveURL(`${PAGE}?deleted=1`);
  await expect(page.getByRole('status')).toHaveText(profile.deleted);
  await page.goto(PAGE);
  await expectEmpty(page);
});

test('AC2: guardar sem nenhuma resposta apaga o perfil', async ({ context, page, baseURL }) => {
  await signInAs('cegonha', context, baseURL);
  await page.goto(PAGE);
  await radio(page, 'pace', 'sprint').check();
  await saveButton(page).click();
  await expect(page).toHaveURL(`${PAGE}?saved=1`);

  await radio(page, 'pace', null).check();
  await saveButton(page).click();
  await expect(page).toHaveURL(`${PAGE}?deleted=1`);
  await expect(page.getByRole('status')).toHaveText(profile.deleted);
  await expectEmpty(page);
});

test('AC6: as respostas não aparecem no Passaporte público', async ({ browser, baseURL }) => {
  const own = await browser.newContext();
  await signInAs('pombo', own, baseURL);
  const ownPage = await own.newPage();
  await ownPage.goto(PAGE);
  await radio(ownPage, 'gradeGoal', 'pass').check();
  await radio(ownPage, 'role', 'follow').check();
  await saveButton(ownPage).click();
  await expect(ownPage).toHaveURL(`${PAGE}?saved=1`);

  const other = await browser.newContext();
  await signInAs('marreco', other, baseURL);
  const otherPage = await other.newPage();
  await otherPage.goto('/u/pombo-teste');
  const text = await otherPage.locator('main').innerText();
  for (const question of Object.values(questions)) expect(text).not.toContain(question.label);
  expect(text).not.toContain(questions.role.options.follow);
  await own.close();
  await other.close();
});

test('AC4: o formulário é um POST normal, sem JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  await signInAs('pato', context, baseURL);
  const page = await context.newPage();
  await page.goto(PAGE);
  const form = page.locator(`form[method="post"][action="${ACTION}"]`);
  await expect(form.first()).toBeAttached();
  await expect(form.locator('input[type="radio"][name="pace"]')).toHaveCount(4);
  await expect(form.locator('input[type="checkbox"][name="periods"]')).toHaveCount(4);
  await context.close();
});

test('AC4: pedidos de outro site são recusados', async ({ context, baseURL }) => {
  await signInAs('pato', context, baseURL);
  const res = await post(
    context.request,
    baseURL,
    { pace: 'sprint' },
    'https://outro-site.example'
  );
  expect(res.status()).toBe(403);
});

test('AC4: sem sessão, guardar leva ao login', async ({ request, baseURL }) => {
  const res = await post(request, baseURL, { pace: 'sprint' });
  expect(res.status()).toBe(303);
  expect(new URL(res.headers().location ?? '', baseURL).pathname).toBe('/login');
});

test('AC3: valores fora das opções dão 400', async ({ context, baseURL }) => {
  // A garça só faz pedidos inválidos: o perfil nunca muda.
  await signInAs('garca', context, baseURL);
  for (const form of [
    { pace: 'fast' },
    { periods: 'noon' },
    { role: 'Lead' },
    { intent: 'destroy' },
  ]) {
    const res = await post(context.request, baseURL, form);
    expect(res.status(), JSON.stringify(form)).toBe(400);
  }
});

test('AC2: a página de privacidade lista o perfil de trabalho', async ({ page }) => {
  const item = en.privacy.items.find((i) => /work profile/i.test(i.data));
  if (item === undefined) throw new Error('privacidade sem o perfil de trabalho');
  await page.goto('/privacy');
  await expect(page.getByText(item.data, { exact: true })).toBeVisible();
});

test('AC5: sem violações de acessibilidade AA', async ({ context, page, baseURL }) => {
  await signInAs('garca', context, baseURL);
  await page.goto(PAGE);
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(violations).toEqual([]);
});

test('AC5: responde-se e guarda-se só com o teclado', async ({ context, page, baseURL }) => {
  await signInAs('marreco', context, baseURL);
  await page.goto(PAGE);
  const keys = Object.keys(questions) as (keyof typeof questions)[];
  const reached = new Set<string>();
  let onStart = false;
  for (let i = 0; i < 60 && !onStart; i += 1) {
    await page.keyboard.press('Tab');
    for (const key of keys) {
      if ((await group(page, key).locator(':focus').count()) > 0) reached.add(key);
    }
    onStart = (await group(page, 'start').locator(':focus').count()) > 0;
  }
  expect(onStart).toBe(true);
  // Nas setas, o rádio com foco fica escolhido.
  for (let i = 0; i < 4; i += 1) {
    if (await radio(page, 'start', 'two-weeks').isChecked()) break;
    await page.keyboard.press('ArrowDown');
  }
  await expect(radio(page, 'start', 'two-weeks')).toBeChecked();

  let onSave = false;
  for (let i = 0; i < 60 && !onSave; i += 1) {
    await page.keyboard.press('Tab');
    for (const key of keys) {
      if ((await group(page, key).locator(':focus').count()) > 0) reached.add(key);
    }
    onSave = await saveButton(page).evaluate((el) => el === document.activeElement);
  }
  expect(onSave).toBe(true);
  expect([...reached].sort()).toEqual([...keys].sort());
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(`${PAGE}?saved=1`);
  await page.goto(PAGE);
  await expect(radio(page, 'start', 'two-weeks')).toBeChecked();
});
