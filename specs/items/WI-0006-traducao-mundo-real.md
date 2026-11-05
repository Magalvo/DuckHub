---
id: WI-0006
title: Tradução "mundo real" dos projetos
status: done
track: WT-0002
owner: Magalvo
acceptance:
  - AC1: um projeto cujo slug está na tabela mostra a descrição "mundo real" correspondente, por exemplo minishell mostra uma descrição de interpretador de linha de comandos em C
  - AC2: um projeto cujo slug não está na tabela mostra apenas o nome original, sem descrição inventada
  - AC3: a tabela é um ficheiro de dados versionado no repositório e validado por schema, com slugs únicos e descrições não vazias
  - AC4: a procura na tabela é feita pelo slug do projeto da API, não pelo nome
---

# WI-0006 — Tradução "mundo real" dos projetos

## Problema

Os nomes dos projetos da 42 (Minishell, Inception, ft_transcendence) não dizem
nada a um recrutador. O Passaporte deve explicá-los na linguagem do mercado.

## Proposta

Uma tabela estática e curada `slug → { title, description }`, em inglês
(língua da UI), com uma função pura de procura. Sem LLM (ADR 0003). Decisões
do humano (2026-11-05):

- **Ficheiro JSON** `src/passport/real-world.json` (uma lista de
  `{ slugs, title, description }`), validado por um schema Zod: slugs únicos
  em toda a tabela, textos não vazios. Editar o conteúdo não obriga a mexer em
  código.
- **Uma entrada pode ter vários slugs.** Na API, o mesmo projeto aparece com
  slugs diferentes (`cub3d` e `42cursus-cub3d`, `minirt` e `42cursus-minirt`),
  e os 10 CPP Modules partilham uma descrição.
- **Só o Common Core** do 42cursus na primeira versão, com os slugs
  confirmados numa chamada real a `/v2/cursus/21/projects` (2026-11-05). Ficam
  de fora os prefixos `42adv-`, `42next-` e `old-`, os exames, e o
  `minishell-<uuid>`. Os outros projetos mostram só o nome.
- **No Passaporte:** por baixo do nome original, o título curto
  (por exemplo "Unix shell in C"). A descrição abre num `<details>`, acessível
  por teclado, para a lista não ficar enorme.
- **Conteúdo:** rascunho do Claude, revisto pelo humano antes do commit.

## Interface

```ts
// src/passport/real-world.ts
export interface RealWorld {
  title: string;
  description: string;
}

/**
 * Schema da tabela: lista de { slugs, title, description }. Cada entrada tem
 * pelo menos um slug; nenhum slug se repete na tabela; textos não vazios.
 */
export const realWorldTableSchema: z.ZodType<
  { slugs: string[]; title: string; description: string }[]
>;

/** Tradução de um projeto pelo slug da API (nunca pelo nome); null se não houver. */
export function realWorldFor(slug: string): RealWorld | null;
```

A procura faz-se no componente do Passaporte: o `passportView` e o snapshot
não mudam.

Na página, para cada projeto com tradução, dentro do `listitem`:

- o título, visível, por baixo do nome original;
- um `<details>` com `<summary>` = `en.passport.aboutProject` e a descrição
  dentro.

Um projeto sem tradução mostra só o nome, sem `<details>`.

## Fora de âmbito

Geração automática ou por LLM, traduções para português, edição da tabela
pela UI, categorias para o radar de skills, projetos fora do Common Core,
dias e exames da Piscine.

## Notas para o agente

- **O conteúdo da tabela é do humano.** Não acrescentes nem mudes entradas sem
  pedido; não inventes slugs.
- O JSON valida-se com o schema quando o módulo carrega: um ficheiro inválido
  tem de falhar logo (teste e arranque), nunca em silêncio.
- O seed do e2e ganha um projeto `42cursus-minishell` para o pato: é contrato.
