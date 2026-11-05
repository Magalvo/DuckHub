import type { NextConfig } from 'next';

const config: NextConfig = {
  // O indicador de dev é injetado na página e o axe analisa-o (AC6).
  devIndicators: false,
  // O `next dev` acrescenta instruções ao AGENTS.md quando deteta um agente.
  // O AGENTS.md é guardrail do projeto: só um humano o altera.
  agentRules: false,
  // O e2e usa uma pasta própria, para não colidir com um `make dev` (ADR 0008).
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  // PGlite (WASM) só fora de produção, para o e2e (ADR 0008): não se empacota.
  serverExternalPackages: ['@electric-sql/pglite'],
};

export default config;
