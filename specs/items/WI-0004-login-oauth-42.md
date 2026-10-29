---
id: WI-0004
title: Login com OAuth da 42 (Lisboa e Porto)
status: draft
track: WT-0002
owner: Magalvo
acceptance:
  - AC1: um visitante sem sessão que abre qualquer página da app, exceto a de privacidade, é encaminhado para o login com a conta da 42
  - AC2: depois de um OAuth bem-sucedido, um utilizador cujo campus principal é 42 Lisboa ou 42 Porto fica com sessão e chega ao seu Passaporte, mesmo que só tenha o cursus da Piscine
  - AC3: um utilizador cujo campus principal é outro é recusado com uma mensagem clara e nenhuma sessão é criada
  - AC4: o access token e o refresh token da 42 nunca chegam ao browser, nem em HTML, nem em JSON, nem em cookies legíveis por JavaScript
  - AC5: terminar sessão invalida a sessão no servidor e pedidos seguintes com o cookie antigo são tratados como sem sessão
  - AC6: se a 42 devolver erro ou o utilizador cancelar a autorização, a app mostra uma mensagem de erro e permite tentar de novo
  - AC7: o utilizador pode apagar a sua conta, o que termina a sessão e remove todos os dados guardados sobre ele
  - AC8: existe uma página de privacidade acessível sem sessão que lista os dados guardados e para que servem
---

# WI-0004 — Login com OAuth da 42 (Lisboa e Porto)

## Problema

O princípio "zero fricção" exige que se entre só com a conta da Intra. No
primeiro incremento, o acesso é restrito à 42 Portugal e o RGPD fica no
mínimo: guardar só o necessário e deixar apagar tudo.

## Proposta

Usar Auth.js no Next.js com o provider OAuth da 42 (Web Application Flow,
scope `public`). A sessão é persistida no PostgreSQL e os tokens da 42 ficam
só no servidor. No callback, usar o cliente do WI-0003 para obter o campus
principal e aplicar a regra de acesso (Lisboa ou Porto) antes de criar a
sessão. Os IDs de campus permitidos são configuração, não estão escritos no
código. Inclui a ação "apagar conta" e uma página de privacidade simples.

## Fora de âmbito

Outros métodos de login, perfis de administração, contas de outros campus,
partilha pública de perfis, exportação de dados.

## Notas para o agente

- **Pré-requisito humano:** registar a aplicação na Intra (redirect URI local)
  e pôr `CLIENT_ID`/`CLIENT_SECRET` em variáveis de ambiente. Nunca no
  repositório (regra 6). Os testes não dependem destas credenciais.
- Regras duras 9 e 10. Base legal: execução do serviço que o utilizador
  pediu (ADR 0003). O texto da página de privacidade é revisto pelo humano.
- Os IDs de campus de Lisboa e Porto obtêm-se em `/v2/campus`. Confirma-os com
  uma chamada real; não os adivinhes.
- Depende de WI-0002 e WI-0003.
