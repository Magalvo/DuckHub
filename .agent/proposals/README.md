# Propostas do agente a ficheiros protegidos

O agente não consegue escrever em caminhos protegidos (`.agent/protected-paths`).
Quando acha que um deles precisa mesmo de mudar, escreve aqui a versão proposta,
no mesmo caminho relativo, e uma nota com o porquê:

```
.agent/proposals/scripts/validate-specs.mjs ← versão proposta
.agent/proposals/scripts/validate-specs.mjs.md ← porquê, em 2-3 frases
```

Um humano revê e aplica, ficheiro a ficheiro, com `make apply-proposals`.
Propostas ao CONTRATO (testes de aceitação, datasets, thresholds) são sinal de
alerta: quase sempre o que está errado é o código.
