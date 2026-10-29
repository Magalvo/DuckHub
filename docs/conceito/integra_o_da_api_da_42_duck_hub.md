# 🔌 Duck Hub - Integração com a 42 API (v2)

A filosofia do Duck Hub é **Zero Fricção**. Ao utilizar a API oficial da 42, os utilizadores não precisam de preencher dados manualmente. A plataforma reage e constrói a experiência com base no percurso real na Intra.

## 1. Onboarding e Identidade (`/v2/me`)
*   **Dados Extraídos:** `login`, `image`, `campus`, `pool_month`, `pool_year`, e `coalitions`.
*   **Aplicação:** 
    *   Criação instantânea de conta (OAuth).
    *   O perfil herda as cores da *Coalition* do utilizador.
    *   Criação automática de grupos "Turma da Piscine" (ex: "Poolers Agosto 2022").

## 2. Live Cluster Map / Presença (`/v2/locations`)
*   **Dados Extraídos:** Host/Computador atual onde o utilizador está logado (`active: true`).
*   **Aplicação:** 
    *   Mostrar em tempo real quem está fisicamente no campus a trabalhar.
    *   Facilitar encontros no local para os Alumni que visitam o cluster.

## 3. Especialistas e Mentores Automáticos (`/v2/scale_teams`)
*   **Dados Extraídos:** Histórico de avaliações (quem avaliou quem, e em que projeto).
*   **Aplicação:** 
    *   O sistema deteta se o utilizador avaliou o `Inception` múltiplas vezes e atribui-lhe a badge de "Especialista em Docker".
    *   Coloca automaticamente esse perfil no topo das recomendações quando alguém pede ajuda (Mentoria/Bounties) para esse projeto específico.

## 4. O "Duck Pond" Vivo (`/v2/projects_users`)
*   **Dados Extraídos:** Status dos projetos, notas finais (`final_mark`), e flags de sucesso/falha.
*   **Aplicação:** 
    *   Geração dos posts automáticos do Feed de Conquistas.
    *   Atualização em tempo real do *Skill Radar Chart* no perfil com base na categoria do projeto concluído.

## 5. Matchmaking e Urgência (`/v2/cursus_users`)
*   **Dados Extraídos:** O temido `blackholed_at` e o `level` atual (XP).
*   **Aplicação:** 
    *   **Indicador de Urgência:** No menu de procurar equipa, utilizadores com *Black Hole* próximo (< 30 dias) recebem um marcador de urgência para a comunidade ajudar.
    *   Alimentação direta da ferramenta *42Calculator* integrada.

## 6. O "Nomad Tracker" Global (`/v2/campus`)
*   **Dados Extraídos:** Interseção do campus de origem do utilizador e o campus onde está a fazer login atualmente (via `/v2/locations`).
*   **Aplicação:** 
    *   Se um aluno da 42 Lisboa faz login num Mac da 42 Paris, o sistema gera um alerta local no Duck Hub: "Um aluno de Lisboa está de visita, diz olá!".