// Contrato com browser (ADR 0005). Os testes em tests/acceptance/e2e/ são o
// CONTRATO; esta config é GUARDRAIL. Nenhum dos dois se altera para ficar verde.
import { defineConfig, devices } from '@playwright/test';

const PORT = 3000;
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
    command: 'make dev',
    url: BASE_URL,
    // Localmente reaproveita um `make dev` já a correr; no CI arranca sempre um novo.
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
