---
id: WI-0008
title: Avatar com iniciais em vez da foto da 42
status: done
track: WT-0002
owner: Magalvo
acceptance:
  - AC1: o Passaporte mostra um círculo com as iniciais do login no lugar da foto, com a primeira letra do login e, se houver hífen, a primeira letra depois dele, em maiúsculas
  - AC2: o fundo do círculo é a cor de destaque do Passaporte (coalition ou Cyber-Teal) e as iniciais são pretas ou brancas, a que tiver mais contraste, com pelo menos 4.5:1 para qualquer cor de fundo
  - AC3: o URL da foto da 42 deixa de ser guardado no snapshot e de ser mostrado; os snapshots já guardados deixam de o ter
  - AC4: o círculo tem um nome acessível e a página continua sem violações de acessibilidade de nível AA
---

# WI-0008 — Avatar com iniciais em vez da foto da 42

## Problema

As fotos de perfil da 42 deixaram de ser acessíveis fora da Intra: todas as
versões (`link`, `large`, `medium`, `small`, `micro`) em `cdn.intra.42.fr`
respondem 403, com ou sem referer e com user agent de browser (verificado pelo
humano a 2026-11-05). O Passaporte mostra uma imagem partida.

## Proposta

Como o Google: um círculo cheio com as iniciais. Decisões do humano
(2026-11-05):

- **Iniciais do login**, sem guardar dados novos (regra 9): `dde-maga` → `DM`,
  `pato-teste` → `PT`, `cisne` → `C`.
- **Fundo na cor de destaque** (coalition, ou Cyber-Teal sem coalition).
  **Letras `#000000` ou `#FFFFFF`**, a que tiver mais contraste com o fundo.
  Para qualquer cor, uma das duas dá pelo menos 4.58:1, por isso o AA está
  sempre garantido. Com o preto do tema (`#080B0F`) isso já não é verdade, daí
  o preto puro.
- **O URL da foto sai do snapshot** (regra 9: se não se mostra, não se guarda).
  Sai também da vista, do seed do e2e e da `/privacy`. Uma migração tira-o dos
  snapshots já guardados. O cliente do WI-0003 continua a ler `image.link`
  (o contrato dele não muda), mas o valor nunca é guardado.

Muda o contrato do WI-0005: o `imageUrl` sai do teste do AC1 e do seed. O
e2e do AC1 continua a procurar um `img` com o nome `en.passport.photoAlt`, que
passa a ser o nome acessível do círculo.

## Interface

```ts
// src/passport/avatar.ts — funções puras
/** Iniciais do login: 1.ª letra e, se houver hífen, a 1.ª depois dele. */
export function initialsFromLogin(login: string): string;
/** Cores do círculo: fundo = cor de destaque; texto = preto ou branco puro. */
export function avatarColors(background: string): {
  background: string;
  text: '#000000' | '#FFFFFF';
};
```

```ts
// src/passport/passport.ts
// PassportSnapshot e PassportView perdem imageUrl.
// PassportView ganha:
initials: string;
avatarText: '#000000' | '#FFFFFF';
```

Página: o círculo é um elemento com `role="img"` e `aria-label` igual a
`en.passport.photoAlt` (o texto passa a descrever as iniciais, por exemplo
"Your initials"). As iniciais em si ficam `aria-hidden`, para não serem lidas
duas vezes. Fundo `background-color` = `accentColor` e cor do texto =
`avatarText`. Não há nenhum `<img>` no Passaporte.

## Fora de âmbito

Fotos de outra origem (upload, Gravatar), iniciais a partir do nome
verdadeiro, avatares para outras pessoas.

## Notas para o agente

- Regras duras 9 e 12. Se a 42 voltar a abrir a CDN, a foto volta noutro WI.
- A migração de dados é uma migração do drizzle-kit
  (`npx drizzle-kit generate --custom`, ADR 0007), por exemplo
  `UPDATE passports SET snapshot = snapshot - 'imageUrl'`.
- Atualiza a `/privacy` e a `/account` (a foto deixa de ser guardada), o
  ADR 0008 e a spec do WI-0005.
- O `next.config.ts` deixa de precisar de configuração de imagens, se a tiver.
