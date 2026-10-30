// Camada 3 — loop determinístico: o linter dá feedback que o agente lê e corrige.
// Regras estritas de propósito. Cada regra desligada exige justificação em ADR.
import eslint from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/',
      'node_modules/',
      'coverage/',
      '.agent/proposals/',
      '.next/',
      'next-env.d.ts',
    ],
  },
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
    // UI (WI-0002). Regra 12: a11y verificada pela máquina (jsx-a11y). AC5: nenhum
    // texto visível escrito nos componentes; vem tudo de src/i18n/messages/.
    files: ['src/**/*.tsx'],
    extends: [
      react.configs.flat.recommended,
      react.configs.flat['jsx-runtime'],
      reactHooks.configs.flat.recommended,
      jsxA11y.flatConfigs.recommended,
      nextPlugin.configs['core-web-vitals'],
    ],
    settings: { react: { version: 'detect' } },
    rules: {
      'react/jsx-no-literals': ['error', { noStrings: true, ignoreProps: true }],
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
