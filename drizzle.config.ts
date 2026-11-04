// drizzle-kit (ADR 0007): `make db-generate` gera o SQL em drizzle/ a partir do
// schema; `make db-migrate` aplica-o à DATABASE_URL do .env (fora do git).
import { defineConfig } from 'drizzle-kit';

try {
  process.loadEnvFile('.env');
} catch (error) {
  // O .env é opcional: o `generate` não precisa dele. Outro erro é real.
  if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
