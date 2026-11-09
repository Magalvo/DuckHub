# ADR-0018 — Alojamento, deploy e observabilidade

- **Estado:** proposto (aceite quando o humano fizer o commit)
- **Data:** 2026-11-09
- **Decisor(es):** Magalvo (decisões de 2026-11-09: PaaS com Postgres gerido,
  aprovação manual para produção, Sentry na UE filtrado)
- **Completa:** o ponto "Alojamento: adiado" do [ADR 0003](0003-onboarding.md)

## Contexto

O Duck Hub corre só localmente (ADR 0003). Para abrir à comunidade é preciso
decidir onde corre, como chega lá cada versão e como se sabe que está bem.

### A escala real

A 42 Portugal tem algumas centenas a poucos milhares de alunos e Alumni. Mesmo
com toda a rede 42, o tráfego cabe num servidor pequeno. O limite que se sente
primeiro é o da **API da 42**: 2 pedidos/s e 1200/h para a aplicação inteira.
No teste no browser de 2026-11-09, uma só chamada à lista de projetos demorou
cerca de 12 s (WI-0023). Escalar o Duck Hub é sobretudo gastar bem essa quota
(cache, sincronizações espaçadas), não ter mais servidores.

### O que o código já assume

Três peças vivem na memória do processo Node (`src/server/runtime.ts`):

1. **O rate limiter da API da 42**: "um por processo". Com duas instâncias, a
   app faria até 4 pedidos/s e a 42 respondia 429.
2. **O token da aplicação** (_client credentials_): em memória, até expirar
   (ADR 0009, regra 10).
3. **A atualização da cache de XP** continua depois de a página responder
   (ADR 0009; o WI-0023 acrescenta o aquecimento no login).

Daqui saem duas restrições: **um só processo** em produção, e **um processo
que continua vivo** entre pedidos. Uma plataforma _serverless_ (por exemplo
Vercel ou funções Lambda) parte as duas: abre instâncias em paralelo e congela
o processo depois da resposta.

### Outras forças

- **RGPD (regra 9):** os dados vêm da Intra e são de pessoas na UE. A base de
  dados, os backups e qualquer serviço que receba erros ficam na UE.
- **OAuth da 42:** cada ambiente precisa de uma aplicação na Intra com o seu
  _redirect URI_. Por isso não há deploys de pré-visualização por PR: só
  ambientes com URL fixa.
- **Uma pessoa a manter:** cada peça que se opera à mão (sistema operativo,
  Postgres, certificados) é tempo que não vai para o produto.
- **Lançamento público** só depois da autorização da 42 / 42 Portugal
  (`docs/canonical/produto.md`). Isto pode atrasar mais do que qualquer
  ferramenta.

### Alternativas consideradas

| Opção                                 | Como é                                                                                                                             | A favor                                                                                        | Contra                                                                                                                  |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **A. PaaS com contentor persistente** | A app num contentor (Railway, Fly.io ou Render), região UE, fixado em 1 instância; Postgres gerido na UE (do próprio PaaS ou Neon) | Sem SO nem certificados para manter; backups e restauro a um clique; deploy a partir do GitHub | Custa mais do que um VPS; é preciso garantir que nunca escala para 2 instâncias                                         |
| **B. Um VPS na UE**                   | Hetzner (ou semelhante) com Docker Compose: app, Postgres e Caddy (TLS)                                                            | Mais barato; controlo total; um só processo por construção                                     | Atualizações do SO, Postgres, backups e restauros ficam à tua conta                                                     |
| **C. Serverless**                     | Vercel ou semelhante, Postgres gerido                                                                                              | Deploy trivial, pré-visualizações                                                              | Parte o rate limiter, o token em memória e a atualização em fundo; só serviria depois de os mover para a BD ou um Redis |

## Decisão

Por camadas. As escolhas de 1, 3 e 5 são do humano (2026-11-09).

### 1. Alojamento

**Opção A:** PaaS com contentor persistente, 1 instância, região UE, com
**Postgres gerido na UE** com recuperação para um ponto no tempo (PITR). Para
um projeto mantido por uma pessoa, não operar o Postgres nem os backups vale
mais do que a poupança do VPS. A opção B fica como recurso se o custo pesar; a
C fica rejeitada enquanto o estado viver no processo.

O fornecedor concreto (Railway, Fly.io ou Render; Postgres do próprio PaaS ou
Neon) escolhe-se comparando preço e região UE no momento da escolha.

### 2. Ambientes

- **Produção** e **staging**, cada um com a sua BD, a sua aplicação OAuth na
  Intra (`CLIENT_ID`/`CLIENT_SECRET` próprios) e o seu `APP_URL`.
- O staging usa só contas de quem testa; nunca uma cópia da BD de produção.
- Sem pré-visualização por PR (ver OAuth da 42 no contexto).

### 3. Deploy contínuo

- O CI atual (`.github/workflows/ci.yml`) continua a ser a porta: nada chega a
  um ambiente com o `make check` vermelho.
- **Merge em `main` → deploy automático para staging.**
- **Staging → produção com aprovação manual:** um _environment_ do GitHub
  protegido, em que o humano aprova cada promoção. Reavalia-se quando houver
  tráfego estável.
- **Imagem:** um `Dockerfile` com o _output_ `standalone` do Next.js, a mesma
  imagem nos dois ambientes.
- **Migrações:** `drizzle-kit migrate` num passo próprio, antes de a versão
  nova arrancar. Como a versão antiga corre durante o deploy, cada migração é
  compatível com ela (primeiro acrescentar, só num deploy seguinte apagar).

### 4. Cloudflare à frente

- DNS, TLS em modo _Full (strict)_ e proteção DDoS.
- Cache só de `/_next/static/*` e das fontes. **Nunca** do HTML nem de
  `/api/*`: as páginas dependem da sessão.
- Uma regra de rate limiting nas rotas de login, para não gastar a quota da
  42 com abusos.

### 5. Observabilidade, em duas fases

**Fase 1 (no lançamento):**

- **Erros:** Sentry com dados na região UE, `sendDefaultPii: false` e um
  filtro (`beforeSend`) que tira cookies, headers, query strings e corpos
  antes de enviar. Um teste unitário prova que o filtro não deixa passar
  nenhum desses campos.
- **Disponibilidade:** um teste externo a uma rota `/api/health` (nova) que
  responde 200 sem tocar na API da 42.
- **Logs:** o stdout da plataforma, em linhas curtas e sem dados da Intra
  (regra 9), como a linha `[xp-cache]` do WI-0023.

**Fase 2 (quando houver tráfego real ou o primeiro incidente sem
explicação):** métricas num Grafana gerido (por exemplo o plano gratuito do
Grafana Cloud), não um Prometheus/Grafana próprio. As métricas que
interessam: pedidos à API da 42, respostas 429, tempo das chamadas,
acertos/falhas da cache de XP e sincronizações falhadas.

### 6. Backups e segredos

- Backups diários com PITR no Postgres gerido; retenção de 7 a 30 dias.
- **Teste de restauro** num ambiente à parte antes do lançamento e depois
  de mês a mês.
- A retenção dos backups conta para o RGPD: uma conta apagada só desaparece
  dos backups quando eles expiram. Fica escrito na política de privacidade.
- Segredos só no cofre da plataforma e nos _secrets_ do GitHub, separados
  por ambiente; nunca no repositório (regra 6).

## Consequências

- **Melhor:** cada merge chega ao staging sem passos manuais; produção só
  recebe versões que passaram pelo `make check` e pelo staging; há sinal de
  erros e de disponibilidade desde o primeiro dia; nenhum dado pessoal sai da
  UE.
- **Pior / limites:** a app não escala na horizontal. Quando precisar (não é
  esperado à escala da 42), o rate limiter e o token passam para a BD ou um
  Redis, num ADR próprio. Até lá, escala-se subindo a máquina.
- **Obrigatório:** 1 instância em produção e em staging (configurado na
  plataforma e escrito no `README`); migrações compatíveis com a versão
  anterior; nenhuma ferramenta de observabilidade recebe dados da Intra.
- **Proibido:** _serverless_ e réplicas enquanto o estado viver no processo;
  cache de HTML no Cloudflare.
- **Como entra no repositório:** os workflows de deploy (`.github/**`) e as
  dependências novas (`package.json`, por exemplo o SDK do Sentry) são
  guardrails: entram por proposta em `.agent/proposals/` e o humano aplica.
  O `Dockerfile`, o `next.config.ts` (`output: 'standalone'`) e a rota
  `/api/health` entram por work-items num track novo de infraestrutura.
- **Por fazer fora do código:** pedir a autorização da 42; registar as duas
  aplicações OAuth na Intra; comprar o domínio e pô-lo no Cloudflare.
