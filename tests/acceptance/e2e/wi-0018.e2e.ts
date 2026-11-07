// tests/acceptance/e2e/wi-0018.e2e.ts
//
// Rascunho preparado pelo Claude a pedido do humano (2026-11-07). Revê antes do
// commit: depois de entrar, isto é o contrato. Os lobbies abrem-se a todos os
// projetos de grupo que a pessoa ainda não validou. Usa o seed do WI-0017: a
// cisne (campus 9001) nunca se inscreveu no minishell, onde estão o pardal, o
// melro e o tordo (e o pisco, que entra e sai noutro teste); o corvo (campus
// 9003) tem o webserv no catálogo do campus, com o lobby vazio. Só o corvo
// cria e sai do lobby do webserv; a cisne só olha.
import { expect, test, type BrowserContext, type Locator, type Page } from '@playwright/test';

import { en } from '../../../src/i18n/messages/en.js';
import seed from './seed-data.json' with { type: 'json' };

const TAVERN = '/tavern';
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

const projectItem = (page: Page, name: string): Locator =>
  page
    .getByRole('list', { name: lobby.projectsLabel })
    .getByRole('listitem')
    .filter({ has: page.getByText(name, { exact: true }) });

test('AC1: sem inscrição, o lobby de um projeto de grupo aparece aberto', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('cisne', context, baseURL);
  await page.goto(TAVERN);
  const item = projectItem(page, 'minishell');
  await expect(item.getByRole('button', { name: lobby.join, exact: true })).toBeVisible();
  // Sem inscrição na Intra, não há sugestão.
  await expect(item.getByText(lobby.suggested)).toHaveCount(0);
});

test('AC2: antes de entrar vê-se só quantas pessoas lá estão, sem logins', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('cisne', context, baseURL);
  await page.goto(TAVERN);
  const item = projectItem(page, 'minishell');
  // pardal, melro e tordo; o pisco pode estar lá por momentos (outro teste).
  // A gaivota expirou e o corvo e o estorninho são de outro campus.
  const count = new RegExp(`^[34] ${lobby.lookingMany}$`);
  await expect(item.getByText(count)).toBeVisible();
  for (const login of ['pardal-teste', 'melro-teste', 'tordo-teste', 'gaivota-teste']) {
    await expect(page.getByText(login)).toHaveCount(0);
  }
  // E o lobby continua fechado a quem não entrou.
  expect((await page.goto(`${TAVERN}/42cursus-minishell`))?.status()).toBe(404);
});

test('AC3: criar o lobby de um projeto onde ainda ninguém está, e sair', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('corvo', context, baseURL);
  await page.goto(TAVERN);
  const item = projectItem(page, 'webserv');
  await expect(item.getByText(`0 ${lobby.lookingMany}`, { exact: true })).toBeVisible();
  // Num lobby vazio, entrar é criar.
  await expect(item.getByRole('button', { name: lobby.join, exact: true })).toHaveCount(0);
  await item.getByRole('button', { name: lobby.create, exact: true }).click();

  await expect(page).toHaveURL(`${TAVERN}/webserv`);
  await expect(page.getByRole('heading', { level: 1, name: 'webserv' })).toBeVisible();
  await expect(page.getByText(lobby.empty, { exact: true })).toBeVisible();

  await page.goto(TAVERN);
  const inside = projectItem(page, 'webserv');
  await expect(inside.getByRole('link', { name: lobby.open })).toHaveAttribute(
    'href',
    `${TAVERN}/webserv`
  );
  await inside.getByRole('button', { name: lobby.leave }).click();
  await expect(page).toHaveURL(TAVERN);
  await expect(
    projectItem(page, 'webserv').getByRole('button', { name: lobby.create, exact: true })
  ).toBeVisible();
});

test('AC1: um projeto já validado continua sem lobby', async ({ context, page, baseURL }) => {
  // O pato validou o minishell, o único projeto de grupo do campus 9001.
  await signInAs('pato', context, baseURL);
  await page.goto(TAVERN);
  await expect(page.getByText(lobby.noProjects, { exact: true })).toBeVisible();
});
