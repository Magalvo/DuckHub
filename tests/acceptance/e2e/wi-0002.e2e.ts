// tests/acceptance/e2e/wi-0002.e2e.ts
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { en } from '../../../src/i18n/messages/en.js';

test('AC2: só dark mode, mesmo com o sistema em modo claro', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(8, 11, 15)'); // #080B0F
});

test('AC4: rail lateral ≥ 768px, barra inferior < 768px', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const desk = await page.getByRole('navigation').first().boundingBox();
  expect(desk?.x).toBe(0);
  expect(desk?.height).toBeGreaterThan(700);

  await page.setViewportSize({ width: 375, height: 812 });
  const mob = await page.getByRole('navigation').first().boundingBox();
  expect((mob?.y ?? 0) + (mob?.height ?? 0)).toBe(812);
  expect(mob?.width).toBe(375);
});

test('AC6: sem violações de acessibilidade AA', async ({ page }) => {
  await page.goto('/');
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(violations).toEqual([]);
});

// Todas as strings do ficheiro de mensagens, achatadas
const messageStrings = (v: unknown): string[] =>
  typeof v === 'string'
    ? [v]
    : typeof v === 'object' && v !== null
      ? Object.values(v).flatMap(messageStrings)
      : [];

test('AC1: a página inicial responde', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
});

test('AC5: todo o texto visível vem do ficheiro de mensagens', async ({ page }) => {
  await page.goto('/');
  const texts = await page.evaluate(() => {
    // Texto que o browser nunca mostra (ex.: payload de hidratação do Next em <script>)
    const notRendered = 'script, style, noscript, template';
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) =>
        (n.parentElement?.closest(notRendered) ?? null) === null
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT,
    });
    const found: string[] = [];
    while (walker.nextNode()) {
      const t = walker.currentNode.textContent?.trim() ?? '';
      if (t !== '') found.push(t);
    }
    return found;
  });
  const allowed = new Set(messageStrings(en));
  expect(texts.length).toBeGreaterThan(0);
  expect(texts.filter((t) => !allowed.has(t))).toEqual([]);
});
