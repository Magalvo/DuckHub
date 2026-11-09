// tests/acceptance/e2e/wi-0019.e2e.ts
//
// Rascunho preparado pelo Claude a pedido do humano (2026-11-09). Revê antes do
// commit: depois de entrar, isto é o contrato. Usa as sessões do seed: o pato
// tem 4 skills do 42cursus acima de 0 (e uma a 0) e skills da c-piscine que
// não se mostram; o marreco só tem a Piscine, com 2 skills; o snapshot da
// cisne não tem o campo skills (snapshot antigo). A secção é uma região com o
// título en.passport.skills.title; o único SVG dentro dela é o radar.
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';

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

const skills = (page: Page) => page.getByRole('region', { name: en.passport.skills.title });

const PATO_SKILLS = [/Rigor\s*6\.42/, /Algorithms & AI\s*4\.50/, /Unix\s*4\.50/, /Web\s*1\.20/];

test('AC1/AC2/AC3: o próprio vê as skills do 42cursus, ordenadas, com radar', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('pato', context, baseURL);
  await page.goto('/');
  const section = skills(page);
  await expect(section).toBeVisible();
  await expect(section).toContainText('42cursus');
  await expect(section.getByRole('listitem')).toHaveText(PATO_SKILLS);
  // A skill a 0 e as da c-piscine não aparecem.
  await expect(section).not.toContainText('Shell');
  await expect(section).not.toContainText('Adaptation & creativity');
  await expect(section.locator('svg')).toHaveCount(1);
});

test('AC6: o radar é decoração e a secção não tem violações de a11y', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('pato', context, baseURL);
  await page.goto('/');
  const section = skills(page);
  await expect(section.locator('svg')).toHaveAttribute('aria-hidden', 'true');
  const results = await new AxeBuilder({ page })
    .include('main')
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('AC7: a mesma secção no Passaporte público', async ({ context, page, baseURL }) => {
  await signInAs('marreco', context, baseURL);
  const response = await page.goto('/u/pato-teste');
  expect(response?.status()).toBe(200);
  const section = skills(page);
  await expect(section).toContainText('42cursus');
  await expect(section.getByRole('listitem')).toHaveText(PATO_SKILLS);
  await expect(section.locator('svg')).toHaveCount(1);
});

test('AC1/AC3: só com a Piscine, as skills da c-piscine e só a lista', async ({
  context,
  page,
  baseURL,
}) => {
  await signInAs('marreco', context, baseURL);
  await page.goto('/');
  const section = skills(page);
  await expect(section).toContainText('C Piscine');
  await expect(section.getByRole('listitem')).toHaveText([/Unix\s*3\.10/, /Rigor\s*2\.05/]);
  await expect(section.locator('svg')).toHaveCount(0);
});

test('AC8: um snapshot antigo sem skills não tem a secção', async ({ context, page, baseURL }) => {
  await signInAs('cisne', context, baseURL);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'cisne-teste' })).toBeVisible();
  await expect(skills(page)).toHaveCount(0);
});
