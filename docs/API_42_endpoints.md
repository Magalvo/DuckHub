# API da 42 (v2) — Referência de Endpoints

> Recolhido de <https://api.intra.42.fr/apidoc> em 9 de novembro de 2026. Descrições dos recursos mantidas em inglês, tal como na documentação oficial.

## Visão geral

- **URL base:** `https://api.intra.42.fr`
- **Estilo:** RESTful, JSON sobre HTTPS
- **Autenticação:** OAuth 2.0 (token Bearer no cabeçalho `Authorization`)
- **Recursos:** 97
- **Endpoints únicos (método + caminho):** 735

### Endpoints por método

| Método   | Total |
| -------- | ----: |
| `GET`    |   376 |
| `POST`   |   116 |
| `PUT`    |    83 |
| `PATCH`  |    84 |
| `DELETE` |    76 |

### Níveis de acesso

A documentação marca cada chamada com um ícone. Nesta referência:

| Símbolo       | Significado na página oficial | Na prática                                                      | Total |
| ------------- | ----------------------------- | --------------------------------------------------------------- | ----: |
| 🔓 App        | sem marcação                  | Basta um token da aplicação (`client_credentials`)              |   245 |
| 👤 Utilizador | _User restricted access call_ | Requer um token em nome de um utilizador (`authorization_code`) |    71 |
| 🔑 Restrito   | _Restricted access call_      | Requer permissões/roles especiais (normalmente staff)           |   419 |

## Autenticação (OAuth 2.0)

1. Cria uma aplicação em <https://profile.intra.42.fr/oauth/applications> para obter `UID` (client_id) e `SECRET`.
2. Pede um token:

```bash
curl -X POST https://api.intra.42.fr/oauth/token \
  -d grant_type=client_credentials \
  -d client_id=$UID \
  -d client_secret=$SECRET
```

3. Usa o token nas chamadas:

```bash
curl -H "Authorization: Bearer $TOKEN" https://api.intra.42.fr/v2/cursus
```

Para endpoints 👤 é preciso o fluxo `authorization_code` (`/oauth/authorize` → `/oauth/token`), para agir em nome do utilizador autenticado.

## Convenções

- `:id`, `:user_id`, `:campus_id`, … são parâmetros de caminho (aceitam o id numérico; muitos recursos aceitam também o _slug_/login).
- `PATCH` e `PUT` aparecem sempre em pares e têm o mesmo efeito (atualização).
- Rotas `…/graph(/on/:field(/by/:interval))` devolvem dados agregados para gráficos; os segmentos entre parênteses são opcionais (ex.: `/v2/users/graph/on/created_at/by/month`).
- Rotas `/v2/me/...` referem-se ao utilizador dono do token (requerem token de utilizador).
- Listagens são paginadas: `page[number]`, `page[size]` (máx. 100); suportam também `filter[campo]`, `range[campo]=min,max` e `sort=campo,-outro`.

## Índice

|                                                 |                                                                     |                                                       |                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------- |
| [Accreditations](#accreditations) (6)           | [Achievements](#achievements) (9)                                   | [Achievements users](#achievements-users) (7)         | [Alumnized users](#alumnized-users) (1)                 |
| [Amendments](#amendments) (6)                   | [Announcements](#announcements) (7)                                 | [Anti grav units](#anti-grav-units) (2)               | [Anti grav units users](#anti-grav-units-users) (7)     |
| [Apps](#apps) (3)                               | [Attachments](#attachments) (9)                                     | [Balances](#balances) (8)                             | [Bloc deadlines](#bloc-deadlines) (6)                   |
| [Blocs](#blocs) (2)                             | [Broadcasts](#broadcasts) (1)                                       | [Campus](#campus) (6)                                 | [Campus users](#campus-users) (6)                       |
| [Certificates](#certificates) (2)               | [Certificates users](#certificates-users) (5)                       | [Closes](#closes) (12)                                | [Clusters](#clusters) (2)                               |
| [Coalitions](#coalitions) (7)                   | [Coalitions users](#coalitions-users) (8)                           | [Commands](#commands) (2)                             | [Community services](#community-services) (12)          |
| [Companies](#companies) (4)                     | [Correction point historics](#correction-point-historics) (1)       | [Cursus](#cursus) (6)                                 | [Cursus users](#cursus-users) (10)                      |
| [Dashes](#dashes) (7)                           | [Dashes users](#dashes-users) (8)                                   | [Endpoints](#endpoints) (7)                           | [Evaluations](#evaluations) (6)                         |
| [Events](#events) (11)                          | [Events users](#events-users) (8)                                   | [Exams](#exams) (12)                                  | [Exams users](#exams-users) (3)                         |
| [Experiences](#experiences) (11)                | [Expertises](#expertises) (6)                                       | [Expertises users](#expertises-users) (10)            | [Feedbacks](#feedbacks) (18)                            |
| [Flags](#flags) (1)                             | [Flash users](#flash-users) (6)                                     | [Flashes](#flashes) (3)                               | [Gitlab users](#gitlab-users) (1)                       |
| [Groups](#groups) (7)                           | [Groups users](#groups-users) (8)                                   | [Internships](#internships) (10)                      | [Journals](#journals) (1)                               |
| [Languages](#languages) (7)                     | [Languages users](#languages-users) (13)                            | [Levels](#levels) (2)                                 | [Locations](#locations) (13)                            |
| [Mailings](#mailings) (7)                       | [Notes](#notes) (8)                                                 | [Notions](#notions) (8)                               | [Offers](#offers) (3)                                   |
| [Offers users](#offers-users) (4)               | [Params project sessions rules](#params-project-sessions-rules) (7) | [Partnerships](#partnerships) (6)                     | [Partnerships users](#partnerships-users) (8)           |
| [Patronages](#patronages) (8)                   | [Patronages reports](#patronages-reports) (13)                      | [Pools](#pools) (4)                                   | [Products](#products) (12)                              |
| [Project data](#project-data) (7)               | [Project sessions](#project-sessions) (5)                           | [Project sessions rules](#project-sessions-rules) (7) | [Project sessions skills](#project-sessions-skills) (5) |
| [Projects](#projects) (11)                      | [Projects users](#projects-users) (21)                              | [Quests](#quests) (9)                                 | [Quests users](#quests-users) (9)                       |
| [Roles](#roles) (7)                             | [Roles entities](#roles-entities) (8)                               | [Rules](#rules) (8)                                   | [Scale teams](#scale-teams) (23)                        |
| [Scales](#scales) (9)                           | [Scores](#scores) (10)                                              | [Search](#search) (2)                                 | [Skills](#skills) (7)                                   |
| [Slots](#slots) (12)                            | [Squads](#squads) (8)                                               | [Squads users](#squads-users) (6)                     | [Subnotions](#subnotions) (7)                           |
| [Tags](#tags) (11)                              | [Tags users](#tags-users) (10)                                      | [Teams](#teams) (18)                                  | [Teams uploads](#teams-uploads) (8)                     |
| [Teams users](#teams-users) (8)                 | [Titles](#titles) (7)                                               | [Titles users](#titles-users) (8)                     | [Transactions](#transactions) (5)                       |
| [Translations](#translations) (7)               | [User candidatures](#user-candidatures) (9)                         | [Users](#users) (33)                                  | [Waitlists](#waitlists) (5)                             |
| [Webhook registeries](#webhook-registeries) (1) |                                                                     |                                                       |                                                         |

---

## Recursos

### Accreditations

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/accreditations.html>

| Método   | Endpoint                 | Acesso      |
| -------- | ------------------------ | ----------- |
| `GET`    | `/v2/accreditations`     | 🔓 App      |
| `GET`    | `/v2/accreditations/:id` | 🔓 App      |
| `POST`   | `/v2/accreditations`     | 🔑 Restrito |
| `PATCH`  | `/v2/accreditations/:id` | 🔑 Restrito |
| `PUT`    | `/v2/accreditations/:id` | 🔑 Restrito |
| `DELETE` | `/v2/accreditations/:id` | 🔑 Restrito |

### Achievements

_Meta-goals earned by users all along their progression._

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/achievements.html>

| Método   | Endpoint                             | Acesso        |
| -------- | ------------------------------------ | ------------- |
| `GET`    | `/v2/achievements`                   | 👤 Utilizador |
| `GET`    | `/v2/cursus/:cursus_id/achievements` | 👤 Utilizador |
| `GET`    | `/v2/campus/:campus_id/achievements` | 👤 Utilizador |
| `GET`    | `/v2/titles/:title_id/achievements`  | 👤 Utilizador |
| `GET`    | `/v2/achievements/:id`               | 🔓 App        |
| `POST`   | `/v2/achievements`                   | 🔑 Restrito   |
| `PATCH`  | `/v2/achievements/:id`               | 🔑 Restrito   |
| `PUT`    | `/v2/achievements/:id`               | 🔑 Restrito   |
| `DELETE` | `/v2/achievements/:id`               | 🔑 Restrito   |

### Achievements users

_Users which earned an achievement_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/achievements_users.html>

| Método   | Endpoint                                              | Acesso      |
| -------- | ----------------------------------------------------- | ----------- |
| `GET`    | `/v2/achievements/:achievement_id/achievements_users` | 🔓 App      |
| `GET`    | `/v2/achievements_users`                              | 🔓 App      |
| `GET`    | `/v2/achievements_users/:id`                          | 🔓 App      |
| `POST`   | `/v2/achievements_users`                              | 🔑 Restrito |
| `PATCH`  | `/v2/achievements_users/:id`                          | 🔑 Restrito |
| `PUT`    | `/v2/achievements_users/:id`                          | 🔑 Restrito |
| `DELETE` | `/v2/achievements_users/:id`                          | 🔑 Restrito |

### Alumnized users

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/alumnized_users.html>

| Método | Endpoint              | Acesso      |
| ------ | --------------------- | ----------- |
| `GET`  | `/v2/alumnized_users` | 🔑 Restrito |

### Amendments

_Modifications applied to an internship._

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/amendments.html>

| Método   | Endpoint                                    | Acesso      |
| -------- | ------------------------------------------- | ----------- |
| `GET`    | `/v2/amendments`                            | 🔓 App      |
| `GET`    | `/v2/users/:user_id/amendments`             | 🔓 App      |
| `GET`    | `/v2/internships/:internship_id/amendments` | 🔓 App      |
| `GET`    | `/v2/amendments/:id`                        | 🔓 App      |
| `POST`   | `/v2/amendments`                            | 🔑 Restrito |
| `DELETE` | `/v2/amendments/:id`                        | 🔑 Restrito |

### Announcements

_An announcement made to users in a cursus on their homepage._

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/announcements.html>

| Método   | Endpoint                                             | Acesso      |
| -------- | ---------------------------------------------------- | ----------- |
| `GET`    | `/v2/announcements/graph(/on/:field(/by/:interval))` | 🔓 App      |
| `GET`    | `/v2/announcements/:id`                              | 🔓 App      |
| `POST`   | `/v2/announcements`                                  | 🔑 Restrito |
| `POST`   | `/v2/cursus/:cursus_id/announcements`                | 🔑 Restrito |
| `PATCH`  | `/v2/announcements/:id`                              | 🔑 Restrito |
| `PUT`    | `/v2/announcements/:id`                              | 🔑 Restrito |
| `DELETE` | `/v2/announcements/:id`                              | 🔑 Restrito |

### Anti grav units

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/anti_grav_units.html>

| Método | Endpoint                  | Acesso      |
| ------ | ------------------------- | ----------- |
| `GET`  | `/v2/anti_grav_units`     | 🔑 Restrito |
| `GET`  | `/v2/anti_grav_units/:id` | 🔑 Restrito |

### Anti grav units users

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/anti_grav_units_users.html>

| Método  | Endpoint                                      | Acesso      |
| ------- | --------------------------------------------- | ----------- |
| `GET`   | `/v2/anti_grav_units_users`                   | 🔑 Restrito |
| `GET`   | `/v2/users/:user_id/anti_grav_units_users`    | 🔑 Restrito |
| `GET`   | `/v2/campus/:campus_id/anti_grav_units_users` | 🔑 Restrito |
| `GET`   | `/v2/anti_grav_units_users/:id`               | 🔑 Restrito |
| `POST`  | `/v2/anti_grav_units_users`                   | 🔑 Restrito |
| `PATCH` | `/v2/anti_grav_units_users/:id`               | 🔑 Restrito |
| `PUT`   | `/v2/anti_grav_units_users/:id`               | 🔑 Restrito |

### Apps

_Applications for the API v2_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/apps.html>

| Método | Endpoint                  | Acesso |
| ------ | ------------------------- | ------ |
| `GET`  | `/v2/apps`                | 🔓 App |
| `GET`  | `/v2/users/:user_id/apps` | 🔓 App |
| `GET`  | `/v2/apps/:id`            | 🔓 App |

### Attachments

_All data which can be linked, like videos, pdfs, or links._

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/attachments.html>

| Método   | Endpoint                                                   | Acesso      |
| -------- | ---------------------------------------------------------- | ----------- |
| `GET`    | `/v2/project_sessions/:project_session_id/attachments`     | 🔓 App      |
| `GET`    | `/v2/projects/:project_id/attachments`                     | 🔓 App      |
| `GET`    | `/v2/attachments`                                          | 🔓 App      |
| `GET`    | `/v2/project_sessions/:project_session_id/attachments/:id` | 🔓 App      |
| `GET`    | `/v2/attachments/:id`                                      | 🔓 App      |
| `POST`   | `/v2/projects/:project_id/attachments`                     | 🔑 Restrito |
| `PATCH`  | `/v2/attachments/:id`                                      | 🔑 Restrito |
| `PUT`    | `/v2/attachments/:id`                                      | 🔑 Restrito |
| `DELETE` | `/v2/attachments/:id`                                      | 🔑 Restrito |

### Balances

_The balance of a pool_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/balances.html>

| Método  | Endpoint                          | Acesso      |
| ------- | --------------------------------- | ----------- |
| `GET`   | `/v2/balances`                    | 🔑 Restrito |
| `GET`   | `/v2/pools/:pool_id/balances`     | 🔑 Restrito |
| `GET`   | `/v2/balances/:id`                | 🔑 Restrito |
| `GET`   | `/v2/pools/:pool_id/balances/:id` | 🔑 Restrito |
| `PATCH` | `/v2/balances/:id`                | 🔑 Restrito |
| `PUT`   | `/v2/balances/:id`                | 🔑 Restrito |
| `PATCH` | `/v2/pools/:pool_id/balances/:id` | 🔑 Restrito |
| `PUT`   | `/v2/pools/:pool_id/balances/:id` | 🔑 Restrito |

### Bloc deadlines

_A bloc_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/bloc_deadlines.html>

| Método  | Endpoint                            | Acesso      |
| ------- | ----------------------------------- | ----------- |
| `GET`   | `/v2/bloc_deadlines`                | 🔑 Restrito |
| `GET`   | `/v2/blocs/:bloc_id/bloc_deadlines` | 🔑 Restrito |
| `GET`   | `/v2/bloc_deadlines/:id`            | 🔑 Restrito |
| `POST`  | `/v2/bloc_deadlines`                | 🔑 Restrito |
| `PATCH` | `/v2/bloc_deadlines/:id`            | 🔑 Restrito |
| `PUT`   | `/v2/bloc_deadlines/:id`            | 🔑 Restrito |

### Blocs

_A bloc is the managing container of coalitions._

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/blocs.html>

| Método | Endpoint        | Acesso |
| ------ | --------------- | ------ |
| `GET`  | `/v2/blocs`     | 🔓 App |
| `GET`  | `/v2/blocs/:id` | 🔓 App |

### Broadcasts

_Broadcasts publicated on a campus_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/broadcasts.html>

| Método | Endpoint                           | Acesso |
| ------ | ---------------------------------- | ------ |
| `GET`  | `/v2/campus/:campus_id/broadcasts` | 🔓 App |

### Campus

_Places where 42 users works_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/campus.html>

| Método  | Endpoint                      | Acesso      |
| ------- | ----------------------------- | ----------- |
| `GET`   | `/v2/campus`                  | 🔓 App      |
| `GET`   | `/v2/campus/:id`              | 🔓 App      |
| `POST`  | `/v2/campus`                  | 🔑 Restrito |
| `PATCH` | `/v2/campus/:id`              | 🔑 Restrito |
| `PUT`   | `/v2/campus/:id`              | 🔑 Restrito |
| `GET`   | `/v2/campus/:campus_id/stats` | 🔓 App      |

### Campus users

_The users wich are in a campus_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/campus_users.html>

| Método | Endpoint                              | Acesso      |
| ------ | ------------------------------------- | ----------- |
| `GET`  | `/v2/campus_users`                    | 🔓 App      |
| `GET`  | `/v2/users/:user_id/campus_users`     | 🔓 App      |
| `GET`  | `/v2/campus_users/:id`                | 🔓 App      |
| `POST` | `/v2/campus_users`                    | 🔑 Restrito |
| `POST` | `/v2/users/:user_id/campus_users`     | 🔑 Restrito |
| `POST` | `/v2/campus_users/:id/set_as_primary` | 🔑 Restrito |

### Certificates

_certificates_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/certificates.html>

| Método | Endpoint               | Acesso      |
| ------ | ---------------------- | ----------- |
| `GET`  | `/v2/certificates`     | 🔑 Restrito |
| `GET`  | `/v2/certificates/:id` | 🔑 Restrito |

### Certificates users

_User belonging to a certificate._

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/certificates_users.html>

| Método   | Endpoint                                              | Acesso      |
| -------- | ----------------------------------------------------- | ----------- |
| `GET`    | `/v2/certificates_users`                              | 🔑 Restrito |
| `GET`    | `/v2/certificates/:certificate_id/certificates_users` | 🔑 Restrito |
| `GET`    | `/v2/users/:user_id/certificates_users`               | 🔑 Restrito |
| `GET`    | `/v2/certificates_users/:id`                          | 🔑 Restrito |
| `DELETE` | `/v2/certificates_users/:id`                          | 🔑 Restrito |

### Closes

_The closing of a 42 account_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/closes.html>

| Método   | Endpoint                    | Acesso      |
| -------- | --------------------------- | ----------- |
| `GET`    | `/v2/closes`                | 🔑 Restrito |
| `GET`    | `/v2/users/:user_id/closes` | 🔑 Restrito |
| `GET`    | `/v2/closes/:id`            | 🔑 Restrito |
| `POST`   | `/v2/closes`                | 🔑 Restrito |
| `POST`   | `/v2/users/:user_id/closes` | 🔑 Restrito |
| `PATCH`  | `/v2/closes/:id`            | 🔑 Restrito |
| `PUT`    | `/v2/closes/:id`            | 🔑 Restrito |
| `DELETE` | `/v2/closes/:id`            | 🔑 Restrito |
| `PATCH`  | `/v2/closes/:id/unclose`    | 🔑 Restrito |
| `PUT`    | `/v2/closes/:id/unclose`    | 🔑 Restrito |
| `PATCH`  | `/v2/closes/:id/close`      | 🔑 Restrito |
| `PUT`    | `/v2/closes/:id/close`      | 🔑 Restrito |

### Clusters

_The clusters_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/clusters.html>

| Método | Endpoint           | Acesso      |
| ------ | ------------------ | ----------- |
| `GET`  | `/v2/clusters`     | 🔑 Restrito |
| `GET`  | `/v2/clusters/:id` | 🔑 Restrito |

### Coalitions

_A users competing inside of a bloc._

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/coalitions.html>

| Método  | Endpoint                        | Acesso      |
| ------- | ------------------------------- | ----------- |
| `GET`   | `/v2/coalitions`                | 🔓 App      |
| `GET`   | `/v2/users/:user_id/coalitions` | 🔓 App      |
| `GET`   | `/v2/blocs/:bloc_id/coalitions` | 🔓 App      |
| `GET`   | `/v2/coalitions/:id`            | 🔓 App      |
| `POST`  | `/v2/coalitions`                | 🔑 Restrito |
| `PATCH` | `/v2/coalitions/:id`            | 🔑 Restrito |
| `PUT`   | `/v2/coalitions/:id`            | 🔑 Restrito |

### Coalitions users

_coalition._

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/coalitions_users.html>

| Método   | Endpoint                                        | Acesso      |
| -------- | ----------------------------------------------- | ----------- |
| `GET`    | `/v2/coalitions/:coalition_id/coalitions_users` | 🔓 App      |
| `GET`    | `/v2/coalitions_users`                          | 🔓 App      |
| `GET`    | `/v2/users/:user_id/coalitions_users`           | 🔓 App      |
| `GET`    | `/v2/coalitions_users/:id`                      | 🔓 App      |
| `POST`   | `/v2/coalitions_users`                          | 🔑 Restrito |
| `PATCH`  | `/v2/coalitions_users/:id`                      | 🔑 Restrito |
| `PUT`    | `/v2/coalitions_users/:id`                      | 🔑 Restrito |
| `DELETE` | `/v2/coalitions_users/:id`                      | 🔑 Restrito |

### Commands

_Products are sold on the intranet shop, here are commands_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/commands.html>

| Método | Endpoint                                              | Acesso |
| ------ | ----------------------------------------------------- | ------ |
| `GET`  | `/v2/products/:product_id/commands`                   | 🔓 App |
| `GET`  | `/v2/campus/:campus_id/products/:product_id/commands` | 🔓 App |

### Community services

_A task that an user have to do for the community. Usually linked with a close._

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/community_services.html>

| Método   | Endpoint                                                  | Acesso      |
| -------- | --------------------------------------------------------- | ----------- |
| `GET`    | `/v2/community_services/graph(/on/:field(/by/:interval))` | 🔓 App      |
| `GET`    | `/v2/closes/:close_id/community_services`                 | 🔓 App      |
| `GET`    | `/v2/community_services`                                  | 🔓 App      |
| `GET`    | `/v2/community_services/:id`                              | 🔓 App      |
| `PUT`    | `/v2/community_services/:id/validate`                     | 🔑 Restrito |
| `PATCH`  | `/v2/community_services/:id/validate`                     | 🔑 Restrito |
| `PUT`    | `/v2/community_services/:id/invalidate`                   | 🔑 Restrito |
| `PATCH`  | `/v2/community_services/:id/invalidate`                   | 🔑 Restrito |
| `POST`   | `/v2/community_services`                                  | 🔑 Restrito |
| `PATCH`  | `/v2/community_services/:id`                              | 🔑 Restrito |
| `PUT`    | `/v2/community_services/:id`                              | 🔑 Restrito |
| `DELETE` | `/v2/community_services/:id`                              | 🔑 Restrito |

### Companies

_Companies from companies website_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/companies.html>

| Método | Endpoint                                      | Acesso      |
| ------ | --------------------------------------------- | ----------- |
| `GET`  | `/v2/companies`                               | 🔑 Restrito |
| `GET`  | `/v2/companies/:id`                           | 🔑 Restrito |
| `GET`  | `/v2/companies/:company_id/subscribed_users`  | 🔑 Restrito |
| `GET`  | `/v2/companies/:company_id/internships_users` | 🔑 Restrito |

### Correction point historics

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/correction_point_historics.html>

| Método | Endpoint                                        | Acesso |
| ------ | ----------------------------------------------- | ------ |
| `GET`  | `/v2/users/:user_id/correction_point_historics` | 🔓 App |

### Cursus

_An educational cycle in 42_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/cursus.html>

| Método   | Endpoint         | Acesso      |
| -------- | ---------------- | ----------- |
| `GET`    | `/v2/cursus`     | 🔓 App      |
| `GET`    | `/v2/cursus/:id` | 🔓 App      |
| `POST`   | `/v2/cursus`     | 🔑 Restrito |
| `PATCH`  | `/v2/cursus/:id` | 🔑 Restrito |
| `PUT`    | `/v2/cursus/:id` | 🔑 Restrito |
| `DELETE` | `/v2/cursus/:id` | 🔑 Restrito |

### Cursus users

_The users wich are in a cursus_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/cursus_users.html>

| Método   | Endpoint                                            | Acesso      |
| -------- | --------------------------------------------------- | ----------- |
| `GET`    | `/v2/cursus_users/graph(/on/:field(/by/:interval))` | 🔓 App      |
| `GET`    | `/v2/cursus_users`                                  | 🔓 App      |
| `GET`    | `/v2/users/:user_id/cursus_users`                   | 🔓 App      |
| `GET`    | `/v2/cursus/:cursus_id/cursus_users`                | 🔓 App      |
| `GET`    | `/v2/cursus_users/:id`                              | 🔓 App      |
| `POST`   | `/v2/cursus_users`                                  | 🔑 Restrito |
| `POST`   | `/v2/users/:user_id/cursus_users`                   | 🔑 Restrito |
| `PATCH`  | `/v2/cursus_users/:id`                              | 🔑 Restrito |
| `PUT`    | `/v2/cursus_users/:id`                              | 🔑 Restrito |
| `DELETE` | `/v2/cursus_users/:id`                              | 🔑 Restrito |

### Dashes

_The Dash is a short-time project_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/dashes.html>

| Método   | Endpoint                                      | Acesso      |
| -------- | --------------------------------------------- | ----------- |
| `GET`    | `/v2/dashes/graph(/on/:field(/by/:interval))` | 🔓 App      |
| `GET`    | `/v2/dashes`                                  | 🔑 Restrito |
| `GET`    | `/v2/dashes/:id`                              | 🔑 Restrito |
| `POST`   | `/v2/dashes`                                  | 🔑 Restrito |
| `PATCH`  | `/v2/dashes/:id`                              | 🔑 Restrito |
| `PUT`    | `/v2/dashes/:id`                              | 🔑 Restrito |
| `DELETE` | `/v2/dashes/:id`                              | 🔑 Restrito |

### Dashes users

_The dash of a user_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/dashes_users.html>

| Método   | Endpoint                                            | Acesso      |
| -------- | --------------------------------------------------- | ----------- |
| `GET`    | `/v2/dashes_users/graph(/on/:field(/by/:interval))` | 🔓 App      |
| `GET`    | `/v2/dashes_users`                                  | 🔓 App      |
| `GET`    | `/v2/dashes/:dash_id/dashes_users`                  | 🔓 App      |
| `GET`    | `/v2/dashes_users/:id`                              | 🔓 App      |
| `POST`   | `/v2/dashes_users`                                  | 🔑 Restrito |
| `PATCH`  | `/v2/dashes_users/:id`                              | 🔑 Restrito |
| `PUT`    | `/v2/dashes_users/:id`                              | 🔑 Restrito |
| `DELETE` | `/v2/dashes_users/:id`                              | 🔑 Restrito |

### Endpoints

_A endpoint for a campus_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/endpoints.html>

| Método   | Endpoint                     | Acesso      |
| -------- | ---------------------------- | ----------- |
| `GET`    | `/v2/endpoints`              | 🔑 Restrito |
| `GET`    | `/v2/endpoints/:id`          | 🔑 Restrito |
| `POST`   | `/v2/endpoints`              | 🔑 Restrito |
| `PATCH`  | `/v2/endpoints/:id`          | 🔑 Restrito |
| `PUT`    | `/v2/endpoints/:id`          | 🔑 Restrito |
| `DELETE` | `/v2/endpoints/:id`          | 🔑 Restrito |
| `POST`   | `/v2/endpoints/:id/callback` | 🔑 Restrito |

### Evaluations

_The Evaluation of a project_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/evaluations.html>

| Método   | Endpoint              | Acesso      |
| -------- | --------------------- | ----------- |
| `GET`    | `/v2/evaluations`     | 🔑 Restrito |
| `GET`    | `/v2/evaluations/:id` | 🔑 Restrito |
| `POST`   | `/v2/evaluations`     | 🔑 Restrito |
| `PATCH`  | `/v2/evaluations/:id` | 🔑 Restrito |
| `PUT`    | `/v2/evaluations/:id` | 🔑 Restrito |
| `DELETE` | `/v2/evaluations/:id` | 🔑 Restrito |

### Events

_The events in a campus or a cursus_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/events.html>

| Método   | Endpoint                                         | Acesso      |
| -------- | ------------------------------------------------ | ----------- |
| `GET`    | `/v2/events/graph(/on/:field(/by/:interval))`    | 🔓 App      |
| `GET`    | `/v2/cursus/:cursus_id/events`                   | 🔓 App      |
| `GET`    | `/v2/campus/:campus_id/events`                   | 🔓 App      |
| `GET`    | `/v2/campus/:campus_id/cursus/:cursus_id/events` | 🔓 App      |
| `GET`    | `/v2/users/:user_id/events`                      | 🔓 App      |
| `GET`    | `/v2/events`                                     | 🔓 App      |
| `GET`    | `/v2/events/:id`                                 | 🔓 App      |
| `POST`   | `/v2/events`                                     | 🔑 Restrito |
| `PATCH`  | `/v2/events/:id`                                 | 🔑 Restrito |
| `PUT`    | `/v2/events/:id`                                 | 🔑 Restrito |
| `DELETE` | `/v2/events/:id`                                 | 🔑 Restrito |

### Events users

_Users registered to an event_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/events_users.html>

| Método   | Endpoint                            | Acesso        |
| -------- | ----------------------------------- | ------------- |
| `GET`    | `/v2/users/:user_id/events_users`   | 🔓 App        |
| `GET`    | `/v2/events/:event_id/events_users` | 🔓 App        |
| `GET`    | `/v2/events_users`                  | 🔓 App        |
| `GET`    | `/v2/events_users/:id`              | 🔓 App        |
| `POST`   | `/v2/events_users`                  | 👤 Utilizador |
| `PATCH`  | `/v2/events_users/:id`              | 👤 Utilizador |
| `PUT`    | `/v2/events_users/:id`              | 👤 Utilizador |
| `DELETE` | `/v2/events_users/:id`              | 👤 Utilizador |

### Exams

_The exam in a campus or a cursus_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/exams.html>

| Método   | Endpoint                                        | Acesso        |
| -------- | ----------------------------------------------- | ------------- |
| `GET`    | `/v2/exams/graph(/on/:field(/by/:interval))`    | 🔓 App        |
| `GET`    | `/v2/cursus/:cursus_id/exams`                   | 👤 Utilizador |
| `GET`    | `/v2/campus/:campus_id/exams`                   | 👤 Utilizador |
| `GET`    | `/v2/campus/:campus_id/cursus/:cursus_id/exams` | 👤 Utilizador |
| `GET`    | `/v2/users/:user_id/exams`                      | 👤 Utilizador |
| `GET`    | `/v2/projects/:project_id/exams`                | 👤 Utilizador |
| `GET`    | `/v2/exams`                                     | 👤 Utilizador |
| `GET`    | `/v2/exams/:id`                                 | 🔓 App        |
| `POST`   | `/v2/exams`                                     | 🔑 Restrito   |
| `PATCH`  | `/v2/exams/:id`                                 | 🔑 Restrito   |
| `PUT`    | `/v2/exams/:id`                                 | 🔑 Restrito   |
| `DELETE` | `/v2/exams/:id`                                 | 🔑 Restrito   |

### Exams users

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/exams_users.html>

| Método   | Endpoint                             | Acesso      |
| -------- | ------------------------------------ | ----------- |
| `GET`    | `/v2/exams/:exam_id/exams_users`     | 🔑 Restrito |
| `POST`   | `/v2/exams/:exam_id/exams_users`     | 🔑 Restrito |
| `DELETE` | `/v2/exams/:exam_id/exams_users/:id` | 🔑 Restrito |

### Experiences

_An experience gained by an user in a particular skill._

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/experiences.html>

| Método   | Endpoint                                                   | Acesso      |
| -------- | ---------------------------------------------------------- | ----------- |
| `GET`    | `/v2/experiences`                                          | 🔑 Restrito |
| `GET`    | `/v2/campus/:campus_id/experiences`                        | 🔑 Restrito |
| `GET`    | `/v2/projects_users/:projects_user_id/experiences`         | 🔑 Restrito |
| `GET`    | `/v2/users/:user_id/experiences`                           | 🔑 Restrito |
| `GET`    | `/v2/skills/:skill_id/experiences`                         | 🔑 Restrito |
| `GET`    | `/v2/partnerships_users/:partnerships_user_id/experiences` | 🔑 Restrito |
| `GET`    | `/v2/experiences/:id`                                      | 🔑 Restrito |
| `POST`   | `/v2/experiences`                                          | 🔑 Restrito |
| `PATCH`  | `/v2/experiences/:id`                                      | 🔑 Restrito |
| `PUT`    | `/v2/experiences/:id`                                      | 🔑 Restrito |
| `DELETE` | `/v2/experiences/:id`                                      | 🔑 Restrito |

### Expertises

_Pedagogic expertises_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/expertises.html>

| Método   | Endpoint             | Acesso      |
| -------- | -------------------- | ----------- |
| `GET`    | `/v2/expertises`     | 🔓 App      |
| `GET`    | `/v2/expertises/:id` | 🔓 App      |
| `POST`   | `/v2/expertises`     | 🔑 Restrito |
| `PATCH`  | `/v2/expertises/:id` | 🔑 Restrito |
| `PUT`    | `/v2/expertises/:id` | 🔑 Restrito |
| `DELETE` | `/v2/expertises/:id` | 🔑 Restrito |

### Expertises users

_Users which have an expertise_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/expertises_users.html>

| Método   | Endpoint                                        | Acesso        |
| -------- | ----------------------------------------------- | ------------- |
| `GET`    | `/v2/expertises/:expertise_id/expertises_users` | 🔓 App        |
| `GET`    | `/v2/users/:user_id/expertises_users`           | 🔓 App        |
| `GET`    | `/v2/expertises_users`                          | 🔓 App        |
| `GET`    | `/v2/expertises_users/:id`                      | 🔓 App        |
| `POST`   | `/v2/expertises/:expertise_id/expertises_users` | 👤 Utilizador |
| `POST`   | `/v2/users/:user_id/expertises_users`           | 👤 Utilizador |
| `POST`   | `/v2/expertises_users`                          | 👤 Utilizador |
| `PATCH`  | `/v2/expertises_users/:id`                      | 👤 Utilizador |
| `PUT`    | `/v2/expertises_users/:id`                      | 👤 Utilizador |
| `DELETE` | `/v2/expertises_users/:id`                      | 👤 Utilizador |

### Feedbacks

_The feedback of a ScaleTeam or an Event_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/feedbacks.html>

| Método   | Endpoint                                       | Acesso        |
| -------- | ---------------------------------------------- | ------------- |
| `GET`    | `/v2/events/:event_id/feedbacks`               | 🔓 App        |
| `GET`    | `/v2/feedbacks`                                | 🔓 App        |
| `GET`    | `/v2/scale_teams/:scale_team_id/feedbacks`     | 🔓 App        |
| `GET`    | `/v2/events/:event_id/feedbacks/:id`           | 🔓 App        |
| `GET`    | `/v2/feedbacks/:id`                            | 🔓 App        |
| `GET`    | `/v2/scale_teams/:scale_team_id/feedbacks/:id` | 🔓 App        |
| `POST`   | `/v2/events/:event_id/feedbacks`               | 👤 Utilizador |
| `POST`   | `/v2/feedbacks`                                | 👤 Utilizador |
| `POST`   | `/v2/scale_teams/:scale_team_id/feedbacks`     | 👤 Utilizador |
| `PATCH`  | `/v2/events/:event_id/feedbacks/:id`           | 👤 Utilizador |
| `PUT`    | `/v2/events/:event_id/feedbacks/:id`           | 👤 Utilizador |
| `PATCH`  | `/v2/feedbacks/:id`                            | 👤 Utilizador |
| `PUT`    | `/v2/feedbacks/:id`                            | 👤 Utilizador |
| `PATCH`  | `/v2/scale_teams/:scale_team_id/feedbacks/:id` | 👤 Utilizador |
| `PUT`    | `/v2/scale_teams/:scale_team_id/feedbacks/:id` | 👤 Utilizador |
| `DELETE` | `/v2/events/:event_id/feedbacks/:id`           | 👤 Utilizador |
| `DELETE` | `/v2/feedbacks/:id`                            | 👤 Utilizador |
| `DELETE` | `/v2/scale_teams/:scale_team_id/feedbacks/:id` | 👤 Utilizador |

### Flags

_Flags from scales_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/flags.html>

| Método | Endpoint    | Acesso |
| ------ | ----------- | ------ |
| `GET`  | `/v2/flags` | 🔓 App |

### Flash users

_The Flash Users_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/flash_users.html>

| Método | Endpoint                                | Acesso      |
| ------ | --------------------------------------- | ----------- |
| `GET`  | `/v2/flashes/:flash_id/flash_users`     | 🔑 Restrito |
| `GET`  | `/v2/flash_users`                       | 🔑 Restrito |
| `GET`  | `/v2/flashes/:flash_id/flash_users/:id` | 🔑 Restrito |
| `GET`  | `/v2/flash_users/:id`                   | 🔑 Restrito |
| `POST` | `/v2/flashes/:flash_id/flash_users`     | 🔑 Restrito |
| `POST` | `/v2/flash_users`                       | 🔑 Restrito |

### Flashes

_The Flash_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/flashes.html>

| Método | Endpoint          | Acesso      |
| ------ | ----------------- | ----------- |
| `GET`  | `/v2/flashes`     | 🔑 Restrito |
| `GET`  | `/v2/flashes/:id` | 🔑 Restrito |
| `POST` | `/v2/flashes`     | 🔑 Restrito |

### Gitlab users

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/gitlab_users.html>

| Método | Endpoint                          | Acesso      |
| ------ | --------------------------------- | ----------- |
| `GET`  | `/v2/users/:user_id/gitlab_users` | 🔑 Restrito |

### Groups

_Groups in which users belong to. It will display a label on their profile and on the forum._

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/groups.html>

| Método   | Endpoint                    | Acesso      |
| -------- | --------------------------- | ----------- |
| `GET`    | `/v2/groups`                | 🔓 App      |
| `GET`    | `/v2/users/:user_id/groups` | 🔓 App      |
| `GET`    | `/v2/groups/:id`            | 🔓 App      |
| `POST`   | `/v2/groups`                | 🔑 Restrito |
| `PATCH`  | `/v2/groups/:id`            | 🔑 Restrito |
| `PUT`    | `/v2/groups/:id`            | 🔑 Restrito |
| `DELETE` | `/v2/groups/:id`            | 🔑 Restrito |

### Groups users

_Users who are in a group._

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/groups_users.html>

| Método   | Endpoint                            | Acesso      |
| -------- | ----------------------------------- | ----------- |
| `GET`    | `/v2/groups_users`                  | 🔓 App      |
| `GET`    | `/v2/groups/:group_id/groups_users` | 🔓 App      |
| `GET`    | `/v2/users/:user_id/groups_users`   | 🔓 App      |
| `GET`    | `/v2/groups_users/:id`              | 🔓 App      |
| `POST`   | `/v2/groups_users`                  | 🔑 Restrito |
| `PATCH`  | `/v2/groups_users/:id`              | 🔑 Restrito |
| `PUT`    | `/v2/groups_users/:id`              | 🔑 Restrito |
| `DELETE` | `/v2/groups_users/:id`              | 🔑 Restrito |

### Internships

_The internship_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/internships.html>

| Método   | Endpoint                             | Acesso      |
| -------- | ------------------------------------ | ----------- |
| `GET`    | `/v2/internships`                    | 🔑 Restrito |
| `GET`    | `/v2/users/:user_id/internships`     | 🔑 Restrito |
| `POST`   | `/v2/internships`                    | 🔑 Restrito |
| `PATCH`  | `/v2/internships/:id`                | 🔑 Restrito |
| `PUT`    | `/v2/internships/:id`                | 🔑 Restrito |
| `PATCH`  | `/v2/users/:user_id/internships/:id` | 🔑 Restrito |
| `PUT`    | `/v2/users/:user_id/internships/:id` | 🔑 Restrito |
| `GET`    | `/v2/internships/:id`                | 🔑 Restrito |
| `GET`    | `/v2/users/:user_id/internships/:id` | 🔑 Restrito |
| `DELETE` | `/v2/internships/:id`                | 🔑 Restrito |

### Journals

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/journals.html>

| Método | Endpoint                         | Acesso      |
| ------ | -------------------------------- | ----------- |
| `GET`  | `/v2/campus/:campus_id/journals` | 🔑 Restrito |

### Languages

_The language_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/languages.html>

| Método   | Endpoint                                         | Acesso      |
| -------- | ------------------------------------------------ | ----------- |
| `GET`    | `/v2/languages/graph(/on/:field(/by/:interval))` | 🔓 App      |
| `GET`    | `/v2/languages`                                  | 🔓 App      |
| `GET`    | `/v2/languages/:id`                              | 🔓 App      |
| `POST`   | `/v2/languages`                                  | 🔑 Restrito |
| `PATCH`  | `/v2/languages/:id`                              | 🔑 Restrito |
| `PUT`    | `/v2/languages/:id`                              | 🔑 Restrito |
| `DELETE` | `/v2/languages/:id`                              | 🔑 Restrito |

### Languages users

_The languages of a user_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/languages_users.html>

| Método   | Endpoint                                               | Acesso      |
| -------- | ------------------------------------------------------ | ----------- |
| `GET`    | `/v2/languages_users/graph(/on/:field(/by/:interval))` | 🔓 App      |
| `GET`    | `/v2/users/:user_id/languages_users`                   | 🔓 App      |
| `GET`    | `/v2/languages_users`                                  | 🔓 App      |
| `GET`    | `/v2/users/:user_id/languages_users/:id`               | 🔓 App      |
| `GET`    | `/v2/languages_users/:id`                              | 🔓 App      |
| `POST`   | `/v2/users/:user_id/languages_users`                   | 🔑 Restrito |
| `POST`   | `/v2/languages_users`                                  | 🔑 Restrito |
| `PATCH`  | `/v2/users/:user_id/languages_users/:id`               | 🔑 Restrito |
| `PUT`    | `/v2/users/:user_id/languages_users/:id`               | 🔑 Restrito |
| `PATCH`  | `/v2/languages_users/:id`                              | 🔑 Restrito |
| `PUT`    | `/v2/languages_users/:id`                              | 🔑 Restrito |
| `DELETE` | `/v2/users/:user_id/languages_users/:id`               | 🔑 Restrito |
| `DELETE` | `/v2/languages_users/:id`                              | 🔑 Restrito |

### Levels

_A level indicator for a cursus._

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/levels.html>

| Método | Endpoint                       | Acesso      |
| ------ | ------------------------------ | ----------- |
| `GET`  | `/v2/levels`                   | 🔑 Restrito |
| `GET`  | `/v2/cursus/:cursus_id/levels` | 🔑 Restrito |

### Locations

_The location of an user in a campus_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/locations.html>

| Método   | Endpoint                                         | Acesso      |
| -------- | ------------------------------------------------ | ----------- |
| `GET`    | `/v2/locations/graph(/on/:field(/by/:interval))` | 🔓 App      |
| `GET`    | `/v2/locations`                                  | 🔓 App      |
| `GET`    | `/v2/users/:user_id/locations`                   | 🔓 App      |
| `GET`    | `/v2/campus/:campus_id/locations`                | 🔓 App      |
| `GET`    | `/v2/locations/:id`                              | 🔓 App      |
| `POST`   | `/v2/locations`                                  | 🔑 Restrito |
| `POST`   | `/v2/users/:user_id/locations`                   | 🔑 Restrito |
| `PATCH`  | `/v2/locations/:id`                              | 🔑 Restrito |
| `PUT`    | `/v2/locations/:id`                              | 🔑 Restrito |
| `PATCH`  | `/v2/users/:user_id/locations/:id`               | 🔑 Restrito |
| `PUT`    | `/v2/users/:user_id/locations/:id`               | 🔑 Restrito |
| `DELETE` | `/v2/locations/:id`                              | 🔑 Restrito |
| `DELETE` | `/v2/campus/:campus_id/locations/end_all`        | 🔑 Restrito |

### Mailings

_Mails from and between 42 entities_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/mailings.html>

| Método   | Endpoint                      | Acesso      |
| -------- | ----------------------------- | ----------- |
| `GET`    | `/v2/mailings`                | 🔑 Restrito |
| `GET`    | `/v2/users/:user_id/mailings` | 🔑 Restrito |
| `GET`    | `/v2/mailings/:id`            | 🔑 Restrito |
| `POST`   | `/v2/mailings`                | 🔑 Restrito |
| `PATCH`  | `/v2/mailings/:id`            | 🔑 Restrito |
| `PUT`    | `/v2/mailings/:id`            | 🔑 Restrito |
| `DELETE` | `/v2/mailings/:id`            | 🔑 Restrito |

### Notes

_A note for an user_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/notes.html>

| Método   | Endpoint                      | Acesso        |
| -------- | ----------------------------- | ------------- |
| `GET`    | `/v2/users/:user_id/notes`    | 👤 Utilizador |
| `GET`    | `/v2/campus/:campus_id/notes` | 👤 Utilizador |
| `GET`    | `/v2/notes`                   | 👤 Utilizador |
| `GET`    | `/v2/notes/:id`               | 👤 Utilizador |
| `POST`   | `/v2/notes`                   | 👤 Utilizador |
| `PATCH`  | `/v2/notes/:id`               | 👤 Utilizador |
| `PUT`    | `/v2/notes/:id`               | 👤 Utilizador |
| `DELETE` | `/v2/notes/:id`               | 👤 Utilizador |

### Notions

_The elearning notion in a cursus_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/notions.html>

| Método   | Endpoint                        | Acesso      |
| -------- | ------------------------------- | ----------- |
| `GET`    | `/v2/cursus/:cursus_id/notions` | 🔓 App      |
| `GET`    | `/v2/tags/:tag_id/notions`      | 🔓 App      |
| `GET`    | `/v2/notions`                   | 🔓 App      |
| `GET`    | `/v2/notions/:id`               | 🔓 App      |
| `POST`   | `/v2/notions`                   | 🔑 Restrito |
| `PATCH`  | `/v2/notions/:id`               | 🔑 Restrito |
| `PUT`    | `/v2/notions/:id`               | 🔑 Restrito |
| `DELETE` | `/v2/notions/:id`               | 🔑 Restrito |

### Offers

_Offers from companies website_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/offers.html>

| Método | Endpoint         | Acesso      |
| ------ | ---------------- | ----------- |
| `GET`  | `/v2/offers`     | 🔓 App      |
| `GET`  | `/v2/offers/:id` | 🔓 App      |
| `POST` | `/v2/offers`     | 🔑 Restrito |

### Offers users

_Users who have subscribed to an offer._

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/offers_users.html>

| Método | Endpoint                            | Acesso      |
| ------ | ----------------------------------- | ----------- |
| `GET`  | `/v2/offers/:offer_id/offers_users` | 🔑 Restrito |
| `GET`  | `/v2/users/:user_id/offers_users`   | 🔑 Restrito |
| `GET`  | `/v2/offers_users`                  | 🔑 Restrito |
| `GET`  | `/v2/offers_users/:id`              | 🔑 Restrito |

### Params project sessions rules

_The value of a parameter for a project sessions rule._

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/params_project_sessions_rules.html>

| Método  | Endpoint                                                                             | Acesso      |
| ------- | ------------------------------------------------------------------------------------ | ----------- |
| `GET`   | `/v2/project_sessions_rules/:project_sessions_rule_id/params_project_sessions_rules` | 🔑 Restrito |
| `GET`   | `/v2/params_project_sessions_rules`                                                  | 🔑 Restrito |
| `GET`   | `/v2/params_project_sessions_rules/:id`                                              | 🔑 Restrito |
| `POST`  | `/v2/project_sessions_rules/:project_sessions_rule_id/params_project_sessions_rules` | 🔑 Restrito |
| `POST`  | `/v2/params_project_sessions_rules`                                                  | 🔑 Restrito |
| `PATCH` | `/v2/params_project_sessions_rules/:id`                                              | 🔑 Restrito |
| `PUT`   | `/v2/params_project_sessions_rules/:id`                                              | 🔑 Restrito |

### Partnerships

_Pedagogic partnerships_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/partnerships.html>

| Método   | Endpoint               | Acesso      |
| -------- | ---------------------- | ----------- |
| `GET`    | `/v2/partnerships`     | 🔓 App      |
| `GET`    | `/v2/partnerships/:id` | 🔓 App      |
| `POST`   | `/v2/partnerships`     | 🔑 Restrito |
| `PATCH`  | `/v2/partnerships/:id` | 🔑 Restrito |
| `PUT`    | `/v2/partnerships/:id` | 🔑 Restrito |
| `DELETE` | `/v2/partnerships/:id` | 🔑 Restrito |

### Partnerships users

_Users doing a partnership_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/partnerships_users.html>

| Método   | Endpoint                                              | Acesso      |
| -------- | ----------------------------------------------------- | ----------- |
| `GET`    | `/v2/partnerships/:partnership_id/partnerships_users` | 🔓 App      |
| `GET`    | `/v2/partnerships_users`                              | 🔓 App      |
| `GET`    | `/v2/partnerships_users/:id`                          | 🔓 App      |
| `POST`   | `/v2/partnerships/:partnership_id/partnerships_users` | 🔑 Restrito |
| `POST`   | `/v2/partnerships_users`                              | 🔑 Restrito |
| `PATCH`  | `/v2/partnerships_users/:id`                          | 🔑 Restrito |
| `PUT`    | `/v2/partnerships_users/:id`                          | 🔑 Restrito |
| `DELETE` | `/v2/partnerships_users/:id`                          | 🔑 Restrito |

### Patronages

_A patronage between two users_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/patronages.html>

| Método   | Endpoint                        | Acesso      |
| -------- | ------------------------------- | ----------- |
| `GET`    | `/v2/patronages`                | 🔑 Restrito |
| `GET`    | `/v2/users/:user_id/patronages` | 🔑 Restrito |
| `GET`    | `/v2/patronages/:id`            | 🔑 Restrito |
| `POST`   | `/v2/patronages`                | 🔑 Restrito |
| `POST`   | `/v2/users/:user_id/patronages` | 🔑 Restrito |
| `PATCH`  | `/v2/patronages/:id`            | 🔑 Restrito |
| `PUT`    | `/v2/patronages/:id`            | 🔑 Restrito |
| `DELETE` | `/v2/patronages/:id`            | 🔑 Restrito |

### Patronages reports

_A report for a patronage_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/patronages_reports.html>

| Método   | Endpoint                                                  | Acesso      |
| -------- | --------------------------------------------------------- | ----------- |
| `GET`    | `/v2/patronages_reports/graph(/on/:field(/by/:interval))` | 🔓 App      |
| `GET`    | `/v2/patronages_reports`                                  | 🔑 Restrito |
| `GET`    | `/v2/users/:user_id/patronages_reports`                   | 🔑 Restrito |
| `GET`    | `/v2/patronages/:patronage_id/patronages_reports`         | 🔑 Restrito |
| `GET`    | `/v2/reports/:report_id/patronages_reports`               | 🔑 Restrito |
| `GET`    | `/v2/patronages_reports/:id`                              | 🔑 Restrito |
| `POST`   | `/v2/patronages_reports`                                  | 🔑 Restrito |
| `POST`   | `/v2/users/:user_id/patronages_reports`                   | 🔑 Restrito |
| `POST`   | `/v2/patronages/:patronage_id/patronages_reports`         | 🔑 Restrito |
| `POST`   | `/v2/reports/:report_id/patronages_reports`               | 🔑 Restrito |
| `PATCH`  | `/v2/patronages_reports/:id`                              | 🔑 Restrito |
| `PUT`    | `/v2/patronages_reports/:id`                              | 🔑 Restrito |
| `DELETE` | `/v2/patronages_reports/:id`                              | 🔑 Restrito |

### Pools

_The pool of evaluation points._

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/pools.html>

| Método   | Endpoint                      | Acesso      |
| -------- | ----------------------------- | ----------- |
| `GET`    | `/v2/pools`                   | 🔑 Restrito |
| `GET`    | `/v2/pools/:id`               | 🔑 Restrito |
| `POST`   | `/v2/pools/:id/points/add`    | 🔑 Restrito |
| `DELETE` | `/v2/pools/:id/points/remove` | 🔑 Restrito |

### Products

_Products are sold on the intranet shop_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/products.html>

| Método   | Endpoint                             | Acesso      |
| -------- | ------------------------------------ | ----------- |
| `GET`    | `/v2/products`                       | 🔓 App      |
| `GET`    | `/v2/campus/:campus_id/products`     | 🔓 App      |
| `GET`    | `/v2/products/:id`                   | 🔓 App      |
| `GET`    | `/v2/campus/:campus_id/products/:id` | 🔓 App      |
| `POST`   | `/v2/products`                       | 🔑 Restrito |
| `POST`   | `/v2/campus/:campus_id/products`     | 🔑 Restrito |
| `PATCH`  | `/v2/products/:id`                   | 🔑 Restrito |
| `PUT`    | `/v2/products/:id`                   | 🔑 Restrito |
| `PATCH`  | `/v2/campus/:campus_id/products/:id` | 🔑 Restrito |
| `PUT`    | `/v2/campus/:campus_id/products/:id` | 🔑 Restrito |
| `DELETE` | `/v2/products/:id`                   | 🔑 Restrito |
| `DELETE` | `/v2/campus/:campus_id/products/:id` | 🔑 Restrito |

### Project data

_Project data for the graph_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/project_data.html>

| Método   | Endpoint                                                | Acesso      |
| -------- | ------------------------------------------------------- | ----------- |
| `GET`    | `/v2/project_data`                                      | 🔓 App      |
| `GET`    | `/v2/project_sessions/:project_session_id/project_data` | 🔓 App      |
| `GET`    | `/v2/project_data/:id`                                  | 🔓 App      |
| `POST`   | `/v2/project_data`                                      | 🔑 Restrito |
| `PATCH`  | `/v2/project_data/:id`                                  | 🔑 Restrito |
| `PUT`    | `/v2/project_data/:id`                                  | 🔑 Restrito |
| `DELETE` | `/v2/project_data/:id`                                  | 🔑 Restrito |

### Project sessions

_A project session defines a particular behaviour for a project, based on the cursus and / or the campus._

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/project_sessions.html>

| Método | Endpoint                                                                     | Acesso |
| ------ | ---------------------------------------------------------------------------- | ------ |
| `GET`  | `/v2/projects/:project_id/project_sessions/graph(/on/:field(/by/:interval))` | 🔓 App |
| `GET`  | `/v2/project_sessions/graph(/on/:field(/by/:interval))`                      | 🔓 App |
| `GET`  | `/v2/projects/:project_id/project_sessions`                                  | 🔓 App |
| `GET`  | `/v2/project_sessions`                                                       | 🔓 App |
| `GET`  | `/v2/project_sessions/:id`                                                   | 🔓 App |

### Project sessions rules

_A rule linked to a project session._

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/project_sessions_rules.html>

| Método  | Endpoint                                                          | Acesso      |
| ------- | ----------------------------------------------------------------- | ----------- |
| `GET`   | `/v2/project_sessions/:project_session_id/project_sessions_rules` | 🔑 Restrito |
| `GET`   | `/v2/project_sessions_rules`                                      | 🔑 Restrito |
| `GET`   | `/v2/project_sessions_rules/:id`                                  | 🔑 Restrito |
| `POST`  | `/v2/project_sessions/:project_session_id/project_sessions_rules` | 🔑 Restrito |
| `POST`  | `/v2/project_sessions_rules`                                      | 🔑 Restrito |
| `PATCH` | `/v2/project_sessions_rules/:id`                                  | 🔑 Restrito |
| `PUT`   | `/v2/project_sessions_rules/:id`                                  | 🔑 Restrito |

### Project sessions skills

_A skill linked to a project session._

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/project_sessions_skills.html>

| Método | Endpoint                                                               | Acesso |
| ------ | ---------------------------------------------------------------------- | ------ |
| `GET`  | `/v2/project_sessions_skills`                                          | 🔓 App |
| `GET`  | `/v2/project_sessions/:project_session_id/project_sessions_skills`     | 🔓 App |
| `GET`  | `/v2/skills/:skill_id/project_sessions_skills`                         | 🔓 App |
| `GET`  | `/v2/project_sessions_skills/:id`                                      | 🔓 App |
| `GET`  | `/v2/project_sessions/:project_session_id/project_sessions_skills/:id` | 🔓 App |

### Projects

_Pedagogic projects of a cursus_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/projects.html>

| Método   | Endpoint                            | Acesso        |
| -------- | ----------------------------------- | ------------- |
| `GET`    | `/v2/cursus/:cursus_id/projects`    | 🔓 App        |
| `GET`    | `/v2/projects/:project_id/projects` | 🔓 App        |
| `GET`    | `/v2/projects`                      | 🔓 App        |
| `GET`    | `/v2/me/projects`                   | 🔓 App        |
| `GET`    | `/v2/projects/:id`                  | 🔓 App        |
| `POST`   | `/v2/projects`                      | 🔑 Restrito   |
| `PATCH`  | `/v2/projects/:id`                  | 🔑 Restrito   |
| `PUT`    | `/v2/projects/:id`                  | 🔑 Restrito   |
| `DELETE` | `/v2/projects/:id`                  | 🔑 Restrito   |
| `PATCH`  | `/v2/projects/:id/retry`            | 👤 Utilizador |
| `PUT`    | `/v2/projects/:id/retry`            | 👤 Utilizador |

### Projects users

_Users which did or are doing a project_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/projects_users.html>

| Método   | Endpoint                                                                   | Acesso        |
| -------- | -------------------------------------------------------------------------- | ------------- |
| `GET`    | `/v2/projects/:project_id/projects_users/graph(/on/:field(/by/:interval))` | 🔓 App        |
| `GET`    | `/v2/users/:user_id/projects_users/graph(/on/:field(/by/:interval))`       | 🔓 App        |
| `GET`    | `/v2/projects_users/graph(/on/:field(/by/:interval))`                      | 🔓 App        |
| `GET`    | `/v2/projects/:project_id/projects_users`                                  | 🔓 App        |
| `GET`    | `/v2/users/:user_id/projects_users`                                        | 🔓 App        |
| `GET`    | `/v2/projects_users`                                                       | 🔓 App        |
| `GET`    | `/v2/projects_users/:id`                                                   | 🔓 App        |
| `POST`   | `/v2/projects/:project_id/projects_users`                                  | 👤 Utilizador |
| `POST`   | `/v2/users/:user_id/projects_users`                                        | 👤 Utilizador |
| `POST`   | `/v2/projects_users`                                                       | 👤 Utilizador |
| `POST`   | `/v2/projects/:project_id/register`                                        | 👤 Utilizador |
| `PATCH`  | `/v2/projects_users/:id`                                                   | 🔑 Restrito   |
| `PUT`    | `/v2/projects_users/:id`                                                   | 🔑 Restrito   |
| `DELETE` | `/v2/projects_users/:id`                                                   | 👤 Utilizador |
| `PATCH`  | `/v2/projects_users/:id/compile`                                           | 👤 Utilizador |
| `PUT`    | `/v2/projects_users/:id/compile`                                           | 👤 Utilizador |
| `PATCH`  | `/v2/projects_users/:id/retry`                                             | 👤 Utilizador |
| `PUT`    | `/v2/projects_users/:id/retry`                                             | 👤 Utilizador |
| `POST`   | `/v2/projects_users/register_childs_and_scales`                            | 👤 Utilizador |
| `DELETE` | `/v2/projects_users/reset`                                                 | 👤 Utilizador |
| `PATCH`  | `/v2/projects_users/scale`                                                 | 👤 Utilizador |

### Quests

_Quests which can or must be done by users_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/quests.html>

| Método   | Endpoint                       | Acesso      |
| -------- | ------------------------------ | ----------- |
| `GET`    | `/v2/quests`                   | 🔑 Restrito |
| `GET`    | `/v2/cursus/:cursus_id/quests` | 🔑 Restrito |
| `GET`    | `/v2/campus/:campus_id/quests` | 🔑 Restrito |
| `GET`    | `/v2/users/:user_id/quests`    | 🔑 Restrito |
| `GET`    | `/v2/quests/:id`               | 🔑 Restrito |
| `POST`   | `/v2/quests`                   | 🔑 Restrito |
| `PATCH`  | `/v2/quests/:id`               | 🔑 Restrito |
| `PUT`    | `/v2/quests/:id`               | 🔑 Restrito |
| `DELETE` | `/v2/quests/:id`               | 🔑 Restrito |

### Quests users

_Users which earned an quest_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/quests_users.html>

| Método   | Endpoint                                            | Acesso      |
| -------- | --------------------------------------------------- | ----------- |
| `GET`    | `/v2/quests_users/graph(/on/:field(/by/:interval))` | 🔓 App      |
| `GET`    | `/v2/quests/:quest_id/quests_users`                 | 🔓 App      |
| `GET`    | `/v2/users/:user_id/quests_users`                   | 🔓 App      |
| `GET`    | `/v2/quests_users`                                  | 🔓 App      |
| `GET`    | `/v2/quests_users/:id`                              | 🔓 App      |
| `POST`   | `/v2/quests_users`                                  | 🔑 Restrito |
| `PATCH`  | `/v2/quests_users/:id`                              | 🔑 Restrito |
| `PUT`    | `/v2/quests_users/:id`                              | 🔑 Restrito |
| `DELETE` | `/v2/quests_users/:id`                              | 🔑 Restrito |

### Roles

_Grants particular privileges to entities like users and applications_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/roles.html>

| Método   | Endpoint                   | Acesso      |
| -------- | -------------------------- | ----------- |
| `GET`    | `/v2/roles`                | 🔓 App      |
| `GET`    | `/v2/users/:user_id/roles` | 🔓 App      |
| `GET`    | `/v2/roles/:id`            | 🔓 App      |
| `POST`   | `/v2/roles`                | 🔑 Restrito |
| `PATCH`  | `/v2/roles/:id`            | 🔑 Restrito |
| `PUT`    | `/v2/roles/:id`            | 🔑 Restrito |
| `DELETE` | `/v2/roles/:id`            | 🔑 Restrito |

### Roles entities

_The applications linked to a role_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/roles_entities.html>

| Método   | Endpoint                                              | Acesso      |
| -------- | ----------------------------------------------------- | ----------- |
| `GET`    | `/v2/roles_entities/graph(/on/:field(/by/:interval))` | 🔓 App      |
| `GET`    | `/v2/roles/:role_id/roles_entities`                   | 🔓 App      |
| `GET`    | `/v2/roles_entities`                                  | 🔓 App      |
| `GET`    | `/v2/roles_entities/:id`                              | 🔓 App      |
| `POST`   | `/v2/roles_entities`                                  | 🔑 Restrito |
| `PATCH`  | `/v2/roles_entities/:id`                              | 🔑 Restrito |
| `PUT`    | `/v2/roles_entities/:id`                              | 🔑 Restrito |
| `DELETE` | `/v2/roles_entities/:id`                              | 🔑 Restrito |

### Rules

_A rule for a project_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/rules.html>

| Método   | Endpoint                                         | Acesso      |
| -------- | ------------------------------------------------ | ----------- |
| `GET`    | `/v2/rules`                                      | 🔑 Restrito |
| `GET`    | `/v2/project_sessions/:project_session_id/rules` | 🔑 Restrito |
| `GET`    | `/v2/rules/:id`                                  | 🔑 Restrito |
| `POST`   | `/v2/rules`                                      | 🔑 Restrito |
| `POST`   | `/v2/project_sessions/:project_session_id/rules` | 🔑 Restrito |
| `PATCH`  | `/v2/rules/:id`                                  | 🔑 Restrito |
| `PUT`    | `/v2/rules/:id`                                  | 🔑 Restrito |
| `DELETE` | `/v2/rules/:id`                                  | 🔑 Restrito |

### Scale teams

_A defence of a team (on a project), involving an evaluator_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/scale_teams.html>

| Método   | Endpoint                                                                | Acesso        |
| -------- | ----------------------------------------------------------------------- | ------------- |
| `GET`    | `/v2/scale_teams/graph(/on/:field(/by/:interval))`                      | 🔓 App        |
| `GET`    | `/v2/projects/:project_id/scale_teams/graph(/on/:field(/by/:interval))` | 🔓 App        |
| `GET`    | `/v2/users/:user_id/scale_teams/graph(/on/:field(/by/:interval))`       | 🔓 App        |
| `GET`    | `/v2/project_sessions/:project_session_id/scale_teams`                  | 🔓 App        |
| `GET`    | `/v2/scale_teams`                                                       | 🔓 App        |
| `GET`    | `/v2/projects/:project_id/scale_teams`                                  | 🔓 App        |
| `GET`    | `/v2/users/:user_id/scale_teams/as_corrector`                           | 🔓 App        |
| `GET`    | `/v2/users/:user_id/scale_teams/as_corrected`                           | 🔓 App        |
| `GET`    | `/v2/users/:user_id/scale_teams`                                        | 🔓 App        |
| `GET`    | `/v2/me/scale_teams/as_corrector`                                       | 🔓 App        |
| `GET`    | `/v2/me/scale_teams/as_corrected`                                       | 🔓 App        |
| `GET`    | `/v2/me/scale_teams`                                                    | 🔓 App        |
| `GET`    | `/v2/project_sessions/:project_session_id/scale_teams/:id`              | 🔓 App        |
| `GET`    | `/v2/scale_teams/:id`                                                   | 🔓 App        |
| `POST`   | `/v2/project_sessions/:project_session_id/scale_teams`                  | 👤 Utilizador |
| `POST`   | `/v2/scale_teams`                                                       | 👤 Utilizador |
| `PATCH`  | `/v2/project_sessions/:project_session_id/scale_teams/:id`              | 👤 Utilizador |
| `PUT`    | `/v2/project_sessions/:project_session_id/scale_teams/:id`              | 👤 Utilizador |
| `PATCH`  | `/v2/scale_teams/:id`                                                   | 👤 Utilizador |
| `PUT`    | `/v2/scale_teams/:id`                                                   | 👤 Utilizador |
| `DELETE` | `/v2/project_sessions/:project_session_id/scale_teams/:id`              | 👤 Utilizador |
| `DELETE` | `/v2/scale_teams/:id`                                                   | 👤 Utilizador |
| `POST`   | `/v2/scale_teams/multiple_create`                                       | 🔑 Restrito   |

### Scales

_A scale is composed by questions which allows an users to rate the quality of a project._

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/scales.html>

| Método   | Endpoint                                          | Acesso      |
| -------- | ------------------------------------------------- | ----------- |
| `GET`    | `/v2/project_sessions/:project_session_id/scales` | 🔑 Restrito |
| `GET`    | `/v2/scales`                                      | 🔑 Restrito |
| `GET`    | `/v2/projects/:project_id/scales`                 | 🔑 Restrito |
| `GET`    | `/v2/users/:user_id/scales`                       | 🔑 Restrito |
| `GET`    | `/v2/scales/:id`                                  | 🔑 Restrito |
| `POST`   | `/v2/scales`                                      | 🔑 Restrito |
| `PATCH`  | `/v2/scales/:id`                                  | 🔑 Restrito |
| `PUT`    | `/v2/scales/:id`                                  | 🔑 Restrito |
| `DELETE` | `/v2/scales/:id`                                  | 🔑 Restrito |

### Scores

_Points given to a coalition._

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/scores.html>

| Método   | Endpoint                                              | Acesso      |
| -------- | ----------------------------------------------------- | ----------- |
| `GET`    | `/v2/scores`                                          | 🔑 Restrito |
| `GET`    | `/v2/coalitions/:coalition_id/scores`                 | 🔑 Restrito |
| `GET`    | `/v2/coalitions_users/:coalitions_user_id/scores`     | 🔑 Restrito |
| `GET`    | `/v2/blocs/:bloc_id/scores`                           | 🔑 Restrito |
| `GET`    | `/v2/scores/:id`                                      | 🔑 Restrito |
| `GET`    | `/v2/coalitions/:coalition_id/scores/:id`             | 🔑 Restrito |
| `GET`    | `/v2/coalitions_users/:coalitions_user_id/scores/:id` | 🔑 Restrito |
| `GET`    | `/v2/blocs/:bloc_id/scores/:id`                       | 🔑 Restrito |
| `POST`   | `/v2/coalitions/:coalition_id/scores`                 | 🔑 Restrito |
| `DELETE` | `/v2/coalitions/:coalition_id/scores/:id`             | 🔑 Restrito |

### Search

_Search among the intranet resources._

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/search.html>

| Método | Endpoint              | Acesso      |
| ------ | --------------------- | ----------- |
| `POST` | `/v2/search/users`    | 🔑 Restrito |
| `POST` | `/v2/search/projects` | 🔑 Restrito |

### Skills

_A particlar skill._

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/skills.html>

| Método   | Endpoint                       | Acesso      |
| -------- | ------------------------------ | ----------- |
| `GET`    | `/v2/skills`                   | 🔓 App      |
| `GET`    | `/v2/cursus/:cursus_id/skills` | 🔓 App      |
| `GET`    | `/v2/skills/:id`               | 🔓 App      |
| `POST`   | `/v2/skills`                   | 🔑 Restrito |
| `PATCH`  | `/v2/skills/:id`               | 🔑 Restrito |
| `PUT`    | `/v2/skills/:id`               | 🔑 Restrito |
| `DELETE` | `/v2/skills/:id`               | 🔑 Restrito |

### Slots

_The slots available to users for booking a project scale team._

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/slots.html>

| Método   | Endpoint                                                          | Acesso        |
| -------- | ----------------------------------------------------------------- | ------------- |
| `GET`    | `/v2/slots/graph(/on/:field(/by/:interval))`                      | 🔓 App        |
| `GET`    | `/v2/projects/:project_id/slots/graph(/on/:field(/by/:interval))` | 🔓 App        |
| `GET`    | `/v2/users/:user_id/slots/graph(/on/:field(/by/:interval))`       | 🔓 App        |
| `GET`    | `/v2/slots`                                                       | 🔓 App        |
| `GET`    | `/v2/projects/:project_id/slots`                                  | 🔓 App        |
| `GET`    | `/v2/users/:user_id/slots`                                        | 🔓 App        |
| `GET`    | `/v2/me/slots`                                                    | 🔓 App        |
| `GET`    | `/v2/slots/:id`                                                   | 🔓 App        |
| `POST`   | `/v2/slots`                                                       | 👤 Utilizador |
| `PATCH`  | `/v2/slots/:id`                                                   | 👤 Utilizador |
| `PUT`    | `/v2/slots/:id`                                                   | 👤 Utilizador |
| `DELETE` | `/v2/slots/:id`                                                   | 👤 Utilizador |

### Squads

_A squads is the managing container of squads_users._

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/squads.html>

| Método   | Endpoint                        | Acesso      |
| -------- | ------------------------------- | ----------- |
| `POST`   | `/v2/blocs/:bloc_id/squads`     | 🔑 Restrito |
| `DELETE` | `/v2/blocs/:bloc_id/squads/:id` | 🔑 Restrito |
| `DELETE` | `/v2/squads/:id`                | 🔑 Restrito |
| `GET`    | `/v2/blocs/:bloc_id/squads`     | 🔑 Restrito |
| `GET`    | `/v2/blocs/:bloc_id/squads/:id` | 🔑 Restrito |
| `GET`    | `/v2/squads/:id`                | 🔑 Restrito |
| `PATCH`  | `/v2/squads/:id`                | 🔑 Restrito |
| `PUT`    | `/v2/squads/:id`                | 🔑 Restrito |

### Squads users

_A squads_users will group users inside a same coalition_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/squads_users.html>

| Método   | Endpoint                              | Acesso      |
| -------- | ------------------------------------- | ----------- |
| `POST`   | `/v2/blocs/:bloc_id/squads_users`     | 🔑 Restrito |
| `DELETE` | `/v2/blocs/:bloc_id/squads_users/:id` | 🔑 Restrito |
| `DELETE` | `/v2/squads_users/:id`                | 🔑 Restrito |
| `GET`    | `/v2/blocs/:bloc_id/squads_users`     | 🔑 Restrito |
| `PATCH`  | `/v2/squads_users/:id`                | 🔑 Restrito |
| `PUT`    | `/v2/squads_users/:id`                | 🔑 Restrito |

### Subnotions

_The elearning subnotion in a notion_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/subnotions.html>

| Método   | Endpoint                            | Acesso      |
| -------- | ----------------------------------- | ----------- |
| `GET`    | `/v2/notions/:notion_id/subnotions` | 🔓 App      |
| `GET`    | `/v2/subnotions`                    | 🔓 App      |
| `GET`    | `/v2/subnotions/:id`                | 🔓 App      |
| `POST`   | `/v2/subnotions`                    | 🔑 Restrito |
| `PATCH`  | `/v2/subnotions/:id`                | 🔑 Restrito |
| `PUT`    | `/v2/subnotions/:id`                | 🔑 Restrito |
| `DELETE` | `/v2/subnotions/:id`                | 🔑 Restrito |

### Tags

_Non-hierarchical keyword, acting as a meta-data and helping to describe entities._

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/tags.html>

| Método   | Endpoint                        | Acesso      |
| -------- | ------------------------------- | ----------- |
| `GET`    | `/v2/projects/:project_id/tags` | 🔓 App      |
| `GET`    | `/v2/issues/:issue_id/tags`     | 🔓 App      |
| `GET`    | `/v2/notions/:notion_id/tags`   | 🔓 App      |
| `GET`    | `/v2/cursus/:cursus_id/tags`    | 🔓 App      |
| `GET`    | `/v2/users/:user_id/tags`       | 🔓 App      |
| `GET`    | `/v2/tags`                      | 🔓 App      |
| `GET`    | `/v2/tags/:id`                  | 🔓 App      |
| `POST`   | `/v2/tags`                      | 🔑 Restrito |
| `PATCH`  | `/v2/tags/:id`                  | 🔑 Restrito |
| `PUT`    | `/v2/tags/:id`                  | 🔑 Restrito |
| `DELETE` | `/v2/tags/:id`                  | 🔑 Restrito |

### Tags users

_Resource associating a User and a Tag._

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/tags_users.html>

| Método   | Endpoint                           | Acesso      |
| -------- | ---------------------------------- | ----------- |
| `GET`    | `/v2/tags_users`                   | 🔓 App      |
| `GET`    | `/v2/users/:user_id/tags_users`    | 🔓 App      |
| `GET`    | `/v2/cursus/:cursus_id/tags_users` | 🔓 App      |
| `GET`    | `/v2/campus/:campus_id/tags_users` | 🔓 App      |
| `GET`    | `/v2/tags/:tag_id/tags_users`      | 🔓 App      |
| `GET`    | `/v2/tags_users/:id`               | 🔓 App      |
| `POST`   | `/v2/tags_users`                   | 🔑 Restrito |
| `PATCH`  | `/v2/tags_users/:id`               | 🔑 Restrito |
| `PUT`    | `/v2/tags_users/:id`               | 🔑 Restrito |
| `DELETE` | `/v2/tags_users/:id`               | 🔑 Restrito |

### Teams

_One or many users which have to finish a project together._

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/teams.html>

| Método   | Endpoint                                                                         | Acesso        |
| -------- | -------------------------------------------------------------------------------- | ------------- |
| `GET`    | `/v2/cursus/:cursus_id/teams/graph(/on/:field(/by/:interval))`                   | 🔓 App        |
| `GET`    | `/v2/users/:user_id/teams/graph(/on/:field(/by/:interval))`                      | 🔓 App        |
| `GET`    | `/v2/users/:user_id/projects/:project_id/teams/graph(/on/:field(/by/:interval))` | 🔓 App        |
| `GET`    | `/v2/teams/graph(/on/:field(/by/:interval))`                                     | 🔓 App        |
| `GET`    | `/v2/projects/:project_id/teams/graph(/on/:field(/by/:interval))`                | 🔓 App        |
| `GET`    | `/v2/cursus/:cursus_id/teams`                                                    | 🔓 App        |
| `GET`    | `/v2/users/:user_id/teams`                                                       | 🔓 App        |
| `GET`    | `/v2/users/:user_id/projects/:project_id/teams`                                  | 🔓 App        |
| `GET`    | `/v2/teams`                                                                      | 🔓 App        |
| `GET`    | `/v2/projects/:project_id/teams`                                                 | 🔓 App        |
| `GET`    | `/v2/project_sessions/:project_session_id/teams`                                 | 🔓 App        |
| `GET`    | `/v2/me/teams`                                                                   | 🔓 App        |
| `GET`    | `/v2/teams/:id`                                                                  | 🔓 App        |
| `POST`   | `/v2/teams`                                                                      | 👤 Utilizador |
| `PATCH`  | `/v2/teams/:id`                                                                  | 👤 Utilizador |
| `PUT`    | `/v2/teams/:id`                                                                  | 👤 Utilizador |
| `DELETE` | `/v2/teams/:id`                                                                  | 👤 Utilizador |
| `POST`   | `/v2/teams/:id/reset_team_uploads`                                               | 👤 Utilizador |

### Teams uploads

_An uploaded mark for a team, given by a bot (like the Moulinette), without any defence._

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/teams_uploads.html>

| Método   | Endpoint                            | Acesso      |
| -------- | ----------------------------------- | ----------- |
| `GET`    | `/v2/teams/:team_id/teams_uploads`  | 🔓 App      |
| `GET`    | `/v2/teams_uploads`                 | 🔓 App      |
| `GET`    | `/v2/teams_uploads/:id`             | 🔓 App      |
| `POST`   | `/v2/teams_uploads`                 | 🔑 Restrito |
| `PATCH`  | `/v2/teams_uploads/:id`             | 🔑 Restrito |
| `PUT`    | `/v2/teams_uploads/:id`             | 🔑 Restrito |
| `DELETE` | `/v2/teams_uploads/:id`             | 🔑 Restrito |
| `POST`   | `/v2/teams_uploads/multiple_create` | 🔑 Restrito |

### Teams users

_Team composed of one User_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/teams_users.html>

| Método   | Endpoint                         | Acesso      |
| -------- | -------------------------------- | ----------- |
| `GET`    | `/v2/teams_users`                | 🔓 App      |
| `GET`    | `/v2/users/:user_id/teams_users` | 🔓 App      |
| `GET`    | `/v2/teams/:team_id/teams_users` | 🔓 App      |
| `GET`    | `/v2/teams_users/:id`            | 🔓 App      |
| `POST`   | `/v2/teams_users`                | 🔑 Restrito |
| `PATCH`  | `/v2/teams_users/:id`            | 🔑 Restrito |
| `PUT`    | `/v2/teams_users/:id`            | 🔑 Restrito |
| `DELETE` | `/v2/teams_users/:id`            | 🔑 Restrito |

### Titles

_Titles a user can obtain, generally through achievements. It will be displayed on their profile and on the forum._

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/titles.html>

| Método   | Endpoint                    | Acesso      |
| -------- | --------------------------- | ----------- |
| `GET`    | `/v2/titles`                | 🔓 App      |
| `GET`    | `/v2/users/:user_id/titles` | 🔓 App      |
| `GET`    | `/v2/titles/:id`            | 🔓 App      |
| `POST`   | `/v2/titles`                | 🔑 Restrito |
| `PATCH`  | `/v2/titles/:id`            | 🔑 Restrito |
| `PUT`    | `/v2/titles/:id`            | 🔑 Restrito |
| `DELETE` | `/v2/titles/:id`            | 🔑 Restrito |

### Titles users

_Users who have a title._

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/titles_users.html>

| Método   | Endpoint                            | Acesso      |
| -------- | ----------------------------------- | ----------- |
| `GET`    | `/v2/titles/:title_id/titles_users` | 🔓 App      |
| `GET`    | `/v2/users/:user_id/titles_users`   | 🔓 App      |
| `GET`    | `/v2/titles_users`                  | 🔓 App      |
| `GET`    | `/v2/titles_users/:id`              | 🔓 App      |
| `POST`   | `/v2/titles_users`                  | 🔑 Restrito |
| `PATCH`  | `/v2/titles_users/:id`              | 🔑 Restrito |
| `PUT`    | `/v2/titles_users/:id`              | 🔑 Restrito |
| `DELETE` | `/v2/titles_users/:id`              | 🔑 Restrito |

### Transactions

_Transaction represents Altarian Dollars earned._

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/transactions.html>

| Método   | Endpoint                          | Acesso      |
| -------- | --------------------------------- | ----------- |
| `GET`    | `/v2/transactions`                | 🔑 Restrito |
| `GET`    | `/v2/users/:user_id/transactions` | 🔑 Restrito |
| `GET`    | `/v2/transactions/:id`            | 🔑 Restrito |
| `POST`   | `/v2/transactions`                | 🔑 Restrito |
| `DELETE` | `/v2/transactions/:id`            | 🔑 Restrito |

### Translations

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/translations.html>

| Método   | Endpoint                  | Acesso      |
| -------- | ------------------------- | ----------- |
| `GET`    | `/v2/translations`        | 🔓 App      |
| `GET`    | `/v2/translations/:id`    | 🔓 App      |
| `POST`   | `/v2/translations`        | 🔑 Restrito |
| `PATCH`  | `/v2/translations/:id`    | 🔑 Restrito |
| `PUT`    | `/v2/translations/:id`    | 🔑 Restrito |
| `DELETE` | `/v2/translations/:id`    | 🔑 Restrito |
| `POST`   | `/v2/translations/upload` | 🔑 Restrito |

### User candidatures

_The candidature of an user_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/user_candidatures.html>

| Método  | Endpoint                              | Acesso      |
| ------- | ------------------------------------- | ----------- |
| `GET`   | `/v2/user_candidatures`               | 🔑 Restrito |
| `GET`   | `/v2/users/:user_id/user_candidature` | 🔑 Restrito |
| `GET`   | `/v2/user_candidatures/:id`           | 🔑 Restrito |
| `POST`  | `/v2/users/:user_id/user_candidature` | 🔑 Restrito |
| `POST`  | `/v2/user_candidatures`               | 🔑 Restrito |
| `PATCH` | `/v2/users/:user_id/user_candidature` | 🔑 Restrito |
| `PUT`   | `/v2/users/:user_id/user_candidature` | 🔑 Restrito |
| `PATCH` | `/v2/user_candidatures/:id`           | 🔑 Restrito |
| `PUT`   | `/v2/user_candidatures/:id`           | 🔑 Restrito |

### Users

_A 42 student, staff, or any entity with a 42 account._

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/users.html>

| Método   | Endpoint                                         | Acesso      |
| -------- | ------------------------------------------------ | ----------- |
| `GET`    | `/v2/users/graph(/on/:field(/by/:interval))`     | 🔓 App      |
| `POST`   | `/v2/users/:id/correction_points/add`            | 🔑 Restrito |
| `DELETE` | `/v2/users/:id/correction_points/remove`         | 🔑 Restrito |
| `GET`    | `/v2/users/:id/locations_stats`                  | 🔓 App      |
| `GET`    | `/v2/users/:id/exam`                             | 🔑 Restrito |
| `GET`    | `/v2/coalitions/:coalition_id/users`             | 🔓 App      |
| `GET`    | `/v2/dashes/:dash_id/users`                      | 🔓 App      |
| `GET`    | `/v2/events/:event_id/users`                     | 🔓 App      |
| `GET`    | `/v2/accreditations/:accreditation_id/users`     | 🔓 App      |
| `GET`    | `/v2/teams/:team_id/users`                       | 🔓 App      |
| `GET`    | `/v2/projects/:project_id/users`                 | 🔓 App      |
| `GET`    | `/v2/partnerships/:partnership_id/users`         | 🔓 App      |
| `GET`    | `/v2/expertises/:expertise_id/users`             | 🔓 App      |
| `GET`    | `/v2/users`                                      | 🔓 App      |
| `GET`    | `/v2/cursus/:cursus_id/users`                    | 🔓 App      |
| `GET`    | `/v2/campus/:campus_id/users`                    | 🔓 App      |
| `GET`    | `/v2/achievements/:achievement_id/users`         | 🔓 App      |
| `GET`    | `/v2/titles/:title_id/users`                     | 🔓 App      |
| `GET`    | `/v2/quests/:quest_id/users`                     | 🔓 App      |
| `GET`    | `/v2/groups/:group_id/users`                     | 🔓 App      |
| `GET`    | `/v2/users/:id`                                  | 🔓 App      |
| `POST`   | `/v2/users`                                      | 🔑 Restrito |
| `PATCH`  | `/v2/users/:id`                                  | 🔑 Restrito |
| `PUT`    | `/v2/users/:id`                                  | 🔑 Restrito |
| `GET`    | `/v2/me`                                         | 🔓 App      |
| `POST`   | `/v2/users/:id/free_past_agu`                    | 🔑 Restrito |
| `POST`   | `/v2/users/:user_id/unfreeze`                    | 🔑 Restrito |
| `POST`   | `/v2/users/:id/set_primary_campus`               | 🔑 Restrito |
| `POST`   | `/v2/users/:id/alumnize`                         | 🔑 Restrito |
| `POST`   | `/v2/users/:id/dealumnize`                       | 🔑 Restrito |
| `DELETE` | `/v2/users/:id/otp_settings/remove`              | 🔑 Restrito |
| `GET`    | `/v2/staff`                                      | 🔑 Restrito |
| `GET`    | `/v2/users/:user_id/projects_users/registration` | 🔓 App      |

### Waitlists

_Waitlist for an event or an exam._

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/waitlists.html>

| Método   | Endpoint                        | Acesso      |
| -------- | ------------------------------- | ----------- |
| `GET`    | `/v2/waitlists`                 | 🔑 Restrito |
| `GET`    | `/v2/events/:event_id/waitlist` | 🔑 Restrito |
| `GET`    | `/v2/exams/:exam_id/waitlist`   | 🔑 Restrito |
| `GET`    | `/v2/waitlists/:id`             | 🔑 Restrito |
| `DELETE` | `/v2/waitlists/:id`             | 🔑 Restrito |

### Webhook registeries

_Webhook Registeries_

Documentação oficial: <https://api.intra.42.fr/apidoc/2.0/webhook_registeries.html>

| Método | Endpoint                                 | Acesso      |
| ------ | ---------------------------------------- | ----------- |
| `POST` | `/v2/webhook_registeries/:id/deactivate` | 🔑 Restrito |

---

## Notas

- A página indica "741 available endpoints": 735 únicos + 6 duplicados = 741, ou seja, a recolha está completa.
- A secção **Skills** da página oficial repete 6 rotas (provavelmente duas versões da mesma rota); foram listadas apenas uma vez.
- Para parâmetros de cada chamada (filtros, campos do corpo, exemplos de resposta), consulta o link da documentação oficial de cada recurso.
