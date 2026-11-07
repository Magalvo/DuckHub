# ADR-0015 — Compatibilidade: pontuação inteira, pesos fixos e dimensões em falta

- **Estado:** proposto (aceite quando o humano fizer o commit)
- **Data:** 2026-11-07
- **Decisor(es):** Magalvo (decisões de 2026-11-07, WI-0014)

## Contexto

The Tavern (WT-0004) sugere com quem fazer um projeto de grupo. Precisa de comparar duas
pessoas pela forma como trabalham, a partir de um questionário fechado (WI-0015) e, mais tarde,
talvez da presença no campus (WI-0016, com opt-in). A comparação tem de ser previsível,
explicável, testável e simétrica: se eu apareço no topo da tua lista, tu apareces no topo da
minha pelo mesmo número.

Alternativas consideradas:

- **Pontuação em vírgula flutuante** em [0,1]: a ordem e os empates passam a depender de erros
  de arredondamento (0,1 + 0,2), e a simetria só é exata se a ordem das somas for fixa.
- **Jaccard no horário** (|A∩B| / |A∪B|): castiga quem marca muitos períodos. Quem pode
  trabalhar de manhã, à tarde e à noite teria uma semelhança baixa com quem só pode à noite,
  embora seja compatível.
- **Dimensão em falta como 0 ou como ½:** 0 castiga quem responde a menos perguntas; ½ inventa
  uma opinião que a pessoa não deu.
- **Pesos aprendidos com dados:** sem dados e sem forma de explicar o resultado.

## Decisão

1. **A compatibilidade é uma função pura** de dois perfis de trabalho, sem relógio nem
   aleatoriedade, e não sabe de onde vêm os dados. O horário entra como "períodos do dia", para
   a presença poder alimentá-lo mais tarde sem mudar o algoritmo.
2. **Pontuação inteira de 0 a 100**, no espírito da regra dura 5: os pesos são pontos inteiros
   que somam 100 (horário 25, começar 20, ambição de nota 20, ritmo 10, estilo 10,
   presencial/remoto 10, papel 5). Arredonda-se uma única vez, no fim, ao inteiro mais próximo
   com .5 para cima. A ordenação e os empates (pelo login, ordem crescente, sem locale) fazem-se
   sobre esse inteiro.
3. **Contas exatas:** todas as semelhanças são múltiplos de 1/12, por isso a soma faz-se em
   inteiros e o arredondamento é uma divisão inteira. A simetria e o .5 não dependem de floats.
4. **Dimensões em falta não contam:** uma dimensão sem resposta de qualquer das duas pessoas sai
   da conta com o seu peso, e os restantes renormalizam. Sem nenhuma dimensão em comum, a
   pontuação é 0 e não há razões.
5. **Horário por sobreposição** |A∩B| / min(|A|,|B|), para não castigar quem tem horário
   flexível.
6. **Semelhança por dimensão** numa tabela fechada (ordinal: igual 1, vizinho ½, extremos 0;
   categórica com um valor intermédio que vale ½). No **papel** ganha o complemento: liderar com
   seguir vale 1, dois líderes ou dois seguidores valem 0.
7. **Razões explicáveis** de um catálogo fixo, com texto em inglês no ficheiro de mensagens, pela
   ordem da tabela. Os outros veem só a pontuação e as razões, nunca as respostas (WI-0015).
8. **"Quando quero começar" é peso, não filtro.** O único filtro obrigatório é o do lobby
   (mesmo projeto e mesmo campus, WI-0017), fora deste algoritmo.

A tabela completa e os exemplos estão no WI-0014.

## Consequências

- Mais fácil: testar por propriedades (limites, simetria, renormalização, determinismo) e
  explicar cada sugestão a quem a vê.
- Mudar um peso ou uma semelhança é uma decisão de produto: novo ADR ou emenda a este, e os
  exemplos do contrato do WI-0014 mudam com ela.
- Acrescentar uma dimensão obriga a rever os pontos para continuarem a somar 100, e as
  semelhanças a continuarem múltiplos de 1/12 (ou a mudar o denominador comum).
- A pontuação compara só duas pessoas. Formar o grupo completo (3+) fica fora; quando entrar,
  precisa de uma regra própria e não de somar pares.
