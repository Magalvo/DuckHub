# ADR-0016 — Lobby: o solo na cache de projetos e a limpeza na sincronização

- **Estado:** aceite; pontos 3 e 4 da decisão substituídos pelo [ADR 0017](0017-lobbies-abertos-a-validacao-tira-do-lobby.md)
- **Data:** 2026-11-07
- **Decisor(es):** Magalvo (decisões de 2026-11-07, WI-0017)

## Contexto

O lobby do The Tavern (WI-0017) só existe para projetos de grupo em que a API diz que a pessoa
está inscrita. É preciso saber, sem pedidos novos à 42 em cada página, que projetos são de grupo,
e garantir que uma entrada não fica para trás quando a pessoa acaba o projeto, esconde o
Passaporte ou deixa passar os 14 dias (RGPD: guardar o mínimo).

Numa resposta real da API, as `project_sessions` trazem `solo`: a Libft e o Philosophers vêm com
`true`; o minishell, o webserv, o ft_irc, o ft_transcendence e o cub3d com `false`. O
`max_people` vem sempre a `null`. O cub3d só tem a session sem campus.

Alternativas consideradas: uma lista curada de projetos de grupo (fica desatualizada e duplica a
API); pedir o projeto à API ao abrir a Tavern (um pedido por projeto e por página, contra o rate
limit); um trabalho agendado para limpar as entradas (infraestrutura nova para um caso raro).

## Decisão

1. **O solo vem da project_session**, escolhida como o XP (ADR 0009): a do mesmo campus e cursus;
   se não houver, a session sem campus. Sem session aplicável ou com `solo` a `null`, conta como a
   solo: na dúvida, não há lobby.
2. **O catálogo é a cache da calculadora** (`project_xp`, por campus, 24 h), que ganha a coluna
   `solo` (`NOT NULL DEFAULT true`). A Tavern não faz pedidos novos à 42. A migração esvazia a
   cache, para o próximo pedido a recarregar já com o solo (as linhas antigas viriam todas a solo).
3. **Os lobbies de uma pessoa** são os projetos do seu snapshot com estado `in_progress`,
   `searching_a_group` ou `creating_group` que o catálogo do seu campus diz serem de grupo.
4. **Limpeza na sincronização do Passaporte**, na mesma transação que grava o snapshot (como o
   Duck Pond, ADR 0013): saem as entradas da pessoa em projetos onde já não está inscrita, e as
   entradas expiradas (mais de 14 dias) de toda a gente.
5. **Esconder o Passaporte** apaga, na mesma transação, todas as entradas da pessoa. Mostrá-lo
   outra vez não as repõe.
6. **Ao ler**, uma entrada só conta se tiver menos de 14 dias, mesmo que a limpeza ainda não tenha
   corrido.

## Consequências

- A Tavern custa zero pedidos à 42 por página; o solo atualiza-se com a cache, até 24 h depois de
  mudar na Intra.
- **A limpeza das entradas expiradas depende de haver logins** de alguém. Chega para o uso
  esperado (há logins todos os dias); sem logins, as linhas ficam, mas nunca se mostram.
- **Limitação conhecida:** com a cache do campus vazia e a API em baixo, o catálogo fica vazio e a
  página mostra `noProjects`, mesmo a quem tem projetos de grupo.
- Os segmentos `/tavern/lobby` e `/tavern/profile` têm prioridade sobre `/tavern/[slug]`; nenhum
  projeto da 42 tem esses slugs.

## Correções da auditoria (2026-11-09)

WI-0022. Duas falhas confirmadas numa auditoria; as secções acima ficam como estavam e estas
regras prevalecem sobre elas onde divergem.

1. **Quem decide se se entra num lobby é o join, na BD.** O handler verificava o Passaporte e só
   depois inseria: um `setHidden(true)` entre os dois apagava as entradas, o join inseria a seguir
   e, ao mostrar o Passaporte outra vez, a pessoa voltava ao lobby sem novo opt-in (contra o
   ponto 5). Agora o `LobbyStore.join` corre numa transação que lê a linha da pessoa em `users`
   com `FOR UPDATE`; sem linha ou com `passport_hidden`, devolve `false` sem inserir; senão,
   insere ou renova e devolve `true`. O handler responde 403 a `false` e mantém a verificação
   prévia só como saída rápida.

   **Porque fica atómico:** o `setHidden` atualiza a mesma linha de `users` na sua transação, e um
   `UPDATE` também a tranca. As duas operações ficam em série: se o join ganhar, o `DELETE` do
   `setHidden` corre depois e apaga a entrada nova; se o `setHidden` ganhar, o join espera pelo
   commit e lê o Passaporte já escondido. **Limite:** os testes correm em PGlite, com uma só
   ligação, e não conseguem provar a concorrência; o `FOR UPDATE` verifica-se na revisão de código.

2. **O solo nunca vem de outro cursus.** O ponto 1 dizia "a session sem campus", e o código usava
   a primeira, de qualquer cursus: um projeto do 42cursus com uma session sem campus da Piscine
   seria classificado pela regra da Piscine. A ordem passa a ser: a session do mesmo campus e
   cursus; a sem campus do mesmo cursus; a sem campus e sem cursus (o cub3d só tem essa); sem
   nenhuma, conta como a solo. Uma session de outro cursus é sempre ignorada: na dúvida, continua a
   não haver lobby.
