import type { NextConfig } from 'next';

const config: NextConfig = {
  // O indicador de dev é injetado na página e o axe analisa-o (AC6).
  devIndicators: false,
  // O `next dev` acrescenta instruções ao AGENTS.md quando deteta um agente.
  // O AGENTS.md é guardrail do projeto: só um humano o altera.
  agentRules: false,
};

export default config;
