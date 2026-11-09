---
id: WT-0006
title: Infraestrutura e observabilidade
status: active
owner: Magalvo
---

# WT-0006 — Infraestrutura e observabilidade

## Objetivo

Pôr o Duck Hub a correr fora da máquina de quem desenvolve e saber como é
usado e quando falha, sem que nenhum dado pessoal ou da Intra saia da UE nem
chegue a terceiros. As decisões estão no
[ADR 0018](../../docs/adr/0018-alojamento-deploy-observabilidade.md)
(alojamento, deploy, erros, logs) e no
[ADR 0019](../../docs/adr/0019-analytics-de-produto.md) (analytics de
produto).

## Âmbito

**Dentro:**

- analytics de produto anónimo (ADR 0019);
- `Dockerfile` com o _output_ `standalone`, rota `/api/health` e deploy
  para staging e produção (ADR 0018);
- Sentry com filtro de dados pessoais (ADR 0018).

**Fora:**

- os workflows de deploy e as dependências novas em si: são guardrails e
  entram por proposta em `.agent/proposals/`, aplicadas pelo humano;
- métricas com Grafana (fase 2 do ADR 0018);
- escolher o fornecedor de alojamento (decisão do humano, fora do repo).

## Work-items

- WI-0025 — PostHog anónimo, sem cookies (ajusta o PR #30 ao ADR 0019)
- Por abrir: `Dockerfile` e `/api/health`; Sentry filtrado.
