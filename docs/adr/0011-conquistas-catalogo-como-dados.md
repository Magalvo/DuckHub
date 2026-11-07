# ADR-0011 — Conquistas: catálogo como dados e avaliador puro

- **Estado:** proposto (aceite quando o humano fizer o commit)
- **Data:** 2026-11-06
- **Decisor(es):** Magalvo (decisões de 2026-11-06, WI-0011)

## Contexto

O WI-0011 traz as primeiras badges ao Passaporte, e elas vão alimentar o feed (WI-0012). A
regra 11 exige que sejam funções puras e determinísticas sobre dados da API, e o ADR 0010 que
tudo o que é público seja positivo. O catálogo (nomes, descrições, limiares) é conteúdo do
humano e vai crescer; as regras têm de se poder rever sem ler código.

Alternativas consideradas: regras como funções TypeScript por badge (expressivas, mas o
catálogo deixa de ser dados e nada impede uma regra de olhar para projetos falhados); regras
como expressões num mini-DSL (poder a mais para quatro casos).

## Decisão

1. **O catálogo é um ficheiro de dados** (`src/badges/catalog.json`): uma lista ordenada de
   `{ id, name, description, rule }`. É validado com Zod (`badgeCatalogSchema`) quando o módulo
   carrega: ids únicos, textos não vazios, objetos estritos. Um catálogo inválido falha no teste
   e no arranque.
2. **As regras são uma união fechada** de quatro tipos: `validated-count` (`min` inteiro ≥ 1),
   `max-mark` (um projeto validado com 125), `level` (`min` > 0) e `alumni`. Nenhum tipo olha
   para projetos falhados ou em curso (AC4); acrescentar ou tirar esses projetos nunca muda as
   badges (testado por propriedade).
3. **O avaliador é puro**: `earnedBadges(snapshot)` devolve `{ id, name, description }` pela
   ordem do catálogo, sem a regra. `passportView` junta-as à vista (`PassportView.badges`) e
   `publicPassportView` passa-as de propósito na lista de campos permitidos (ADR 0010).
4. **"Validado" é `projectState(p) === 'done'`** (`finished` e `validated: true`), a mesma
   função que decide o que o Passaporte mostra. A badge e a vista pública nunca divergem. Os
   projetos validados contam todos, incluindo os da Piscine.
5. **O nível da badge é o nível que o Passaporte mostra**, não o bruto. `shownLevel`
   (`src/passport/rules.ts`) devolve o nível truncado a duas casas, depois de arredondar a 6
   casas, e `formatLevel` usa-o. Uma badge de nível só aparece quando o número mostrado é
   ≥ `min`: 9.999999 mostra "9.99" e não dá Level 10; 9.9999999 mostra "10.00" e dá. Conta
   só o cursus com o slug exato `42cursus`; o nível da Piscine não dá badges.
6. **Aspeto**: etiqueta em maiúsculas monoespaçadas com um ícone comum (decorativo,
   `aria-hidden`), nos tokens do tema e nunca na cor da coalition, com a descrição visível.
   Sem badges, a lista não aparece.

## Consequências

Melhor: o humano edita o catálogo sem tocar em código, e o schema impede uma badge que não se
consiga verificar ou que revele o negativo. As badges são determinísticas e o feed (WI-0012)
pode calculá-las a partir de dois snapshots.

Pior: uma badge que precise de outra regra obriga a mudar o schema e o avaliador.

Obrigatório:

- Um tipo de regra novo entra no schema, no avaliador e neste ADR (ou num que o substitua), e
  nunca pode depender de projetos falhados ou em curso nem de dados fora do snapshot.
- O `en.privacy.visibility` menciona as badges (ADR 0010, decisão 7).
