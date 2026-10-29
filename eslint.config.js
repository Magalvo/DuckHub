// Camada 3 — loop determinístico: o linter dá feedback que o agente lê e corrige.
// Regras estritas de propósito. Cada regra desligada exige justificação em ADR.
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'coverage/', '.agent/proposals/'] },
  {
    // Comentários eslint-disable no código são ignorados: desligar uma regra
    // passa por esta config (protegida) e por um ADR, nunca por um comentário
    // que o agente escreve para ficar verde.
    linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: 'error' },
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Agentes tendem a "resolver" erros de tipo com escape hatches. Bloquear.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      // Promessas esquecidas são a classe de bug mais comum em código gerado.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },
  {
    // Scripts de tooling (Node puro, sem type-checking de projeto)
    files: ['scripts/**/*.mjs', '.claude/hooks/**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: { process: 'readonly', console: 'readonly', URL: 'readonly' },
    },
  }
);
