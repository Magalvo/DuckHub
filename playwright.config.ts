// Contrato com browser (ADR 0005). Os testes em tests/acceptance/e2e/ são o
// CONTRATO; esta config é GUARDRAIL. Nenhum dos dois se altera para ficar verde.
import { defineConfig, devices } from '@playwright/test';

// Porta própria (ADR 0008): o `make dev` de quem desenvolve fica na 3000.
const PORT = 3100;
const BASE_URL = `http://localhost:${String(PORT)}`;
const isCI = process.env.CI !== undefined && process.env.CI !== '';

export default defineConfig({
  testDir: 'tests/acceptance/e2e',
  testMatch: '*.e2e.ts',
  // Determinismo: um teste instável corrige-se, não se repete até passar.
  retries: 0,
  forbidOnly: isCI,
  fullyParallel: true,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // ADR 0008: o seed do contrato recria uma BD PGlite sintética em disco e só
    // depois arranca a app, que a usa. Nunca reaproveita um servidor, porque a
    // BD é recriada a cada corrida. O distDir próprio evita colidir com um
    // `make dev` a correr na mesma pasta.
    command: `node tests/acceptance/e2e/seed.mjs && npx next dev --port ${String(PORT)}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_TELEMETRY_DISABLED: '1',
      NEXT_DIST_DIR: '.next-e2e',
      DATABASE_URL: 'pglite:.e2e/db',
      CLIENT_ID: 'e2e-client-id-sintetico',
      CLIENT_SECRET: 'e2e-client-secret-sintetico',
      APP_URL: BASE_URL,
      ALLOWED_CAMPUS_IDS: '9001',
      // WI-0025 (ADR 0019): o PostHog liga-se com uma chave sintética ao host
      // local; os pedidos vão para a própria app e o teste interceta-os. Nada
      // sai para a rede.
      NEXT_PUBLIC_POSTHOG_KEY: 'phc_e2e_sintetico',
      NEXT_PUBLIC_POSTHOG_HOST: `${BASE_URL}/ingest-e2e`,
    },
  },
});
