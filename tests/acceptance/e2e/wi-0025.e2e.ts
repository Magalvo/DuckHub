// tests/acceptance/e2e/wi-0025.e2e.ts
//
// Rascunho preparado pelo Claude a pedido do humano (2026-11-10). Revê antes do
// commit: depois de entrar, isto é o contrato. O e2e liga o PostHog com uma
// chave sintética e o host local http://localhost:3100/ingest-e2e (ADR 0019,
// playwright.config.ts). Este teste interceta esses pedidos no browser e
// responde ele mesmo: nada sai para a rede. Usa o pato (login pato-teste).
import { gunzipSync } from 'node:zlib';

import { expect, test, type BrowserContext, type Request } from '@playwright/test';

import seed from './seed-data.json' with { type: 'json' };

const INGEST = '/ingest-e2e/';

// O posthog-js deita fora os eventos de browsers que parecem bots: olha para o
// userAgent, para o navigator.userAgentData (que no Chromium headless diz
// "HeadlessChrome") e para o navigator.webdriver. Este teste faz-se passar por
// um Chrome normal; o código de produção não muda por causa disto.
test.use({
  userAgent:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
});

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
  return user.login;
}

/**
 * O corpo de um pedido do posthog-js, descomprimido: gzip (reconhecido pelos
 * primeiros bytes, porque nem sempre vem indicado no URL), base64 ou texto.
 */
function decode(request: Request): string {
  const url = new URL(request.url());
  const body = request.postDataBuffer() ?? Buffer.alloc(0);
  if (body[0] === 0x1f && body[1] === 0x8b) return gunzipSync(body).toString('utf8');
  const compression = url.searchParams.get('compression');
  const text = body.toString('utf8');
  if (compression === 'base64' || text.startsWith('data=')) {
    const encoded = decodeURIComponent(text.replace(/^data=/, ''));
    return Buffer.from(encoded, 'base64').toString('utf8');
  }
  return text;
}

test('AC7: navegar pelo próprio Passaporte e pela comunidade não envia o login ao PostHog', async ({
  context,
  page,
  baseURL,
}) => {
  const login = await signInAs('pato', context, baseURL);
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'userAgentData', { get: () => undefined });
  });
  const sent: { url: string; body: string }[] = [];
  await context.route(`**${INGEST}**`, async (route) => {
    const request = route.request();
    sent.push({ url: request.url(), body: decode(request) });
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":1}' });
  });
  const pageViews = () => sent.filter((s) => s.body.includes('page_viewed')).length;

  // Cada página espera pelo seu page_viewed antes de passar à seguinte.
  await page.goto(`/u/${login}`);
  await expect.poll(pageViews, { timeout: 15_000 }).toBeGreaterThanOrEqual(1);
  await page.goto(`/community?q=${login}`);
  await expect.poll(pageViews, { timeout: 15_000 }).toBeGreaterThanOrEqual(2);
  await page.goto('/pond');
  await expect.poll(pageViews, { timeout: 15_000 }).toBeGreaterThanOrEqual(3);

  const all = sent.map((s) => `${s.url}\n${s.body}`).join('\n');
  // Os eventos levam o padrão da rota…
  expect(all).toContain('/u/[login]');
  expect(all).toContain('/community');
  // …e nunca o login, nem nos URLs nem nos corpos.
  expect(all).not.toContain(login);

  // Nada guardado no browser.
  const cookies = await context.cookies();
  expect(cookies.filter((c) => c.name.startsWith('ph_')).map((c) => c.name)).toEqual([]);
  const stored = await page.evaluate(() => [
    ...Object.keys(window.localStorage),
    ...Object.keys(window.sessionStorage),
  ]);
  expect(stored.filter((k) => k.startsWith('ph_'))).toEqual([]);
});
