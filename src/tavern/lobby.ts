// Lobby LFG do The Tavern (WI-0017, WI-0018, ADRs 0016 e 0017). Há lobby em
// cada projeto de grupo (solo: false na project_session) do campus que a pessoa
// ainda não validou, inscrita ou não: a API não expõe os pré-requisitos. Entrar
// é o opt-in para revelar esse projeto a quem está no mesmo lobby e campus;
// antes de entrar vê-se só quantas pessoas lá estão. O POST /tavern/lobby segue o /pond/ducks: Origin da
// app, sessão do cookie, formulário validado. Sair funciona sempre.
import { z } from 'zod';

import { crossOrigin, getSession, type AuthDeps } from '../auth/handlers';
import type { PassportSnapshot } from '../passport/passport';
import { realWorldSlugGroups } from '../passport/real-world';

/**
 * Os estados de inscrição em curso na Intra. Desde o WI-0018 (ADR 0017) já
 * não decidem quem tem lobby nem quem sai dele na sincronização.
 */
export const LOBBY_STATUSES: readonly string[] = [
  'in_progress',
  'searching_a_group',
  'creating_group',
];

/** Uma entrada conta durante 14 dias; depois, volta-se a entrar. */
export const LOBBY_TTL_DAYS = 14;

/** Estados em que a Intra diz que a pessoa procura grupo: sugestão privada. */
const SUGGESTED: readonly string[] = ['searching_a_group', 'creating_group'];

export interface LobbyProject {
  slug: string;
  name: string;
  /** Só o próprio vê isto (AC2). */
  suggested: boolean;
}

/** Grupos de slugs do mesmo projeto (realWorldSlugGroups); o primeiro é o do lobby. */
export type SlugGroups = readonly (readonly string[])[];

/** O primeiro slug do grupo de cada slug que está num grupo. */
function primaryOf(groups: SlugGroups): Map<string, string> {
  const primary = new Map<string, string>();
  for (const group of groups) {
    const [first] = group;
    if (first === undefined) continue;
    for (const slug of group) primary.set(slug, first);
  }
  return primary;
}

/** Os slugs dados e todos os do seu grupo, sem repetir (ADR 0017). */
export function sameProjectSlugs(slugs: readonly string[], groups: SlugGroups): string[] {
  const all = new Set(slugs);
  for (const group of groups) {
    if (group.some((slug) => all.has(slug))) for (const slug of group) all.add(slug);
  }
  return [...all];
}

/**
 * Os projetos de grupo do catálogo do campus que a pessoa ainda não validou
 * (validated === true fecha o lobby; um falhado continua), pela ordem do
 * catálogo e com o nome do catálogo. Sem Passaporte sincronizado não há nenhum.
 * Os slugs do mesmo grupo são um só projeto (ADR 0017): o lobby usa o primeiro
 * slug do grupo, na posição da primeira entrada do grupo no catálogo; o nome é
 * o da entrada com esse slug ou, sem ela, o da primeira do grupo. Há lobby se
 * algum slug do grupo for de grupo; validar qualquer deles fecha-o.
 */
export function lobbyProjects(
  snapshot: PassportSnapshot | null,
  catalog: readonly { slug: string; name: string; solo: boolean }[],
  groups: SlugGroups = []
): LobbyProject[] {
  if (snapshot === null) return [];
  const primary = primaryOf(groups);
  const lobbyOf = (slug: string): string => primary.get(slug) ?? slug;

  const entries = new Map<string, { slug: string; name: string; solo: boolean }[]>();
  for (const entry of catalog) {
    const lobby = lobbyOf(entry.slug);
    const list = entries.get(lobby);
    if (list === undefined) entries.set(lobby, [entry]);
    else list.push(entry);
  }

  const validated = new Set<string>();
  const suggested = new Set<string>();
  for (const p of snapshot.projects) {
    if (p.validated === true) validated.add(lobbyOf(p.slug));
    if (SUGGESTED.includes(p.status)) suggested.add(lobbyOf(p.slug));
  }

  return [...entries].flatMap(([slug, list]) => {
    if (validated.has(slug) || list.every((e) => e.solo)) return [];
    const named = list.find((e) => e.slug === slug) ?? list[0];
    if (named === undefined) return [];
    return [{ slug, name: named.name, suggested: suggested.has(slug) }];
  });
}

/** Os lobbies de uma pessoa: o snapshot dela contra o catálogo do seu campus. */
export async function loadLobbyProjects(
  userId: string,
  deps: {
    loadSnapshot(userId: string): Promise<PassportSnapshot | null>;
    campusOf(userId: string): Promise<number | null>;
    catalog(campusId: number): Promise<readonly { slug: string; name: string; solo: boolean }[]>;
  }
): Promise<LobbyProject[]> {
  const [snapshot, campusId] = await Promise.all([
    deps.loadSnapshot(userId),
    deps.campusOf(userId),
  ]);
  if (snapshot === null || campusId === null) return [];
  return lobbyProjects(snapshot, await deps.catalog(campusId), realWorldSlugGroups);
}

/** "78% match": a pontuação do WI-0014 como se mostra no lobby. */
export const matchLabel = (score: number, word: string): string => `${String(score)}% ${word}`;

/** "3 people in this lobby": one só para 1, many para os outros (0 incluído). */
export const lookingLabel = (count: number, one: string, many: string): string =>
  `${String(count)} ${count === 1 ? one : many}`;

/** Um slug da Intra: minúsculas, dígitos, _ e -, sem nada que pareça um caminho. */
export const projectSlugSchema = z.string().regex(/^[a-z0-9][a-z0-9_-]*$/);

const lobbyForm = z.object({
  intent: z.enum(['join', 'leave']),
  project: projectSlugSchema,
});

/** Cada campo uma só vez e em texto; senão, null (400). */
function fieldsOf(form: FormData): { intent: string; project: string } | null {
  const fields: Record<string, string> = {};
  for (const key of ['intent', 'project'] as const) {
    const values = form.getAll(key);
    const [only] = values;
    if (values.length !== 1 || typeof only !== 'string') return null;
    fields[key] = only;
  }
  const parsed = lobbyForm.safeParse(fields);
  return parsed.success ? parsed.data : null;
}

const status = (code: number): Response => new Response(null, { status: code });

const seeOther = (location: string): Response =>
  new Response(null, { status: 303, headers: { location, 'cache-control': 'no-store' } });

/**
 * POST /tavern/lobby, por esta ordem: Origin de outro site → 403; sem sessão
 * → 303 /login; intent ou project inválidos, em falta ou repetidos → 400;
 * leave → apaga e 303 /tavern; join com o Passaporte escondido ou fora dos
 * lobbyProjects → 403; join → cria ou renova e 303 /tavern/<slug>. O isHidden
 * é só a saída rápida: quem decide é o store.join, na BD (WI-0022). Se o
 * Passaporte foi escondido entretanto, o join devolve false → 403.
 */
export async function handleLobby(
  req: Request,
  deps: {
    auth: AuthDeps;
    isHidden(userId: string): Promise<boolean>;
    projectsOf(userId: string): Promise<LobbyProject[]>;
    store: {
      join(userId: string, slug: string): Promise<boolean>;
      leave(userId: string, slug: string): Promise<void>;
    };
  }
): Promise<Response> {
  if (crossOrigin(req, deps.auth.config)) return status(403);
  const session = await getSession(req, deps.auth);
  if (session === null) return seeOther('/login');

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return status(400); // um corpo que não é formulário
  }
  const fields = fieldsOf(form);
  if (fields === null) return status(400);
  const { intent, project } = fields;
  const { userId } = session;

  if (intent === 'leave') {
    await deps.store.leave(userId, project);
    return seeOther('/tavern');
  }

  if (await deps.isHidden(userId)) return status(403);
  const projects = await deps.projectsOf(userId);
  if (!projects.some((p) => p.slug === project)) return status(403);
  if (!(await deps.store.join(userId, project))) return status(403);
  return seeOther(`/tavern/${project}`);
}
