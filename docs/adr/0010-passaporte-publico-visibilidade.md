# ADR-0010 — Passaporte público e opção de o esconder

- **Estado:** proposto (aceite quando o humano fizer o commit)
- **Data:** 2026-11-06
- **Decisor(es):** Magalvo (decisões de 2026-11-06, WT-0003 e WI-0009)

## Contexto

Até ao WI-0009, cada pessoa só via o seu Passaporte (WI-0005, AC7). A WT-0003 (Comunidade)
precisa de que os alunos se vejam uns aos outros. A regra 9 e o RGPD obrigam a duas coisas: só
se mostra o que a pessoa não se importa de mostrar, e há um direito de oposição. Outra
restrição: a página de alguém que se escondeu não pode revelar que essa pessoa existe no Duck
Hub.

Alternativas consideradas: escondido por omissão, com opt-in (comunidade vazia no arranque);
esconder campos à escolha (fora de âmbito); server action para a definição (preterida por um
route handler, como o `/account/delete`, que se testa como uma função `Request → Response` e
reutiliza a defesa de Origin do WI-0004).

## Decisão

1. **Visível à comunidade por omissão.** A coluna `users.passport_hidden` (boolean, NOT NULL,
   por omissão `false`; migração `0004_users_passport_hidden`) guarda a escolha. Muda-se em
   `/account` com um formulário `POST /account/visibility` (campo `hidden` = `"true"` ou
   `"false"`, validado com Zod). O handler (`src/passport/visibility.ts`) exige sessão, recusa
   um `Origin` de outro site com 403 (o mesmo `crossOrigin` do WI-0004), responde 400 a um campo
   inválido e 303 para `/account`. Um novo login não desfaz a escolha.
2. **Os outros só veem o positivo.** `publicPassportView` (`src/passport/public.ts`) é uma função
   pura com uma **lista de campos permitidos**: login, iniciais, campus, Piscine, Alumni,
   coalition, cor, nível e só os projetos `done`, com a nota. Ficam de fora os projetos
   falhados e em curso e a data da sincronização. Um campo novo no `PassportView` só chega à
   comunidade quando alguém o acrescenta aqui de propósito.
3. **A filtragem faz-se no servidor**, antes de render: o que não se mostra não vai no HTML nem
   no payload do React.
4. **Escondido e inexistente respondem igual.** `/u/<login>` dá o mesmo 404, com o mesmo texto
   (`en.publicPassport.notFound`), para: login fora do formato da 42 (`^[a-z0-9-]{1,32}$`,
   validado com Zod antes de ir à BD), login que não existe, conta sem Passaporte sincronizado
   (ou com snapshot inválido) e Passaporte escondido visto por outra pessoa. Maiúsculas no URL
   dão 404, sem redirecionar.
5. **O teu próprio `/u/<login>` mostra a vista pública**, com a nota `en.publicPassport.ownPreview`,
   mesmo que estejas escondido: é a pré-visualização do que a comunidade vê. O Passaporte
   completo continua em `/`, que mostra o aviso `en.passport.hiddenNotice` (com a ligação a
   `/account`) enquanto estiveres escondido.
6. **Logins repetidos.** Na BD, só o `intra_id` é único; o login não. `loadPublic(login)`
   escolhe a conta com o Passaporte sincronizado mais recentemente.
7. **O texto `en.privacy.visibility` lista o que os outros veem.** Tem de mudar sempre que a
   vista pública mudar. Em particular, **o WI-0011 (conquistas) tem de o atualizar quando as
   badges entrarem na vista pública**.

## Consequências

Melhor: a comunidade começa cheia e a escolha de cada um respeita-se em todas as superfícies
que vierem (diretório no WI-0010, feed no WI-0012): quem esconde, sai. A filtragem é uma
função pura, coberta por testes de aceitação e property-based.

Pior: uma consulta a mais em `/` e em `/account` (`isHidden`). A vista pública e o texto da
`/privacy` têm de andar juntos à mão.

Obrigatório:

- Toda a superfície nova que mostre o Passaporte, ou dados dele, de outra pessoa (diretório,
  feed, Rubber Ducks) usa a vista pública e respeita `passport_hidden`.
- Uma resposta a outra pessoa nunca distingue "escondido" de "não existe".
- Mudar `publicPassportView` obriga a rever `en.privacy.visibility` (decisão 7).
