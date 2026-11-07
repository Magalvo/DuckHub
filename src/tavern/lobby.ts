// Lobby LFG do The Tavern (WI-0017, WI-0018, ADRs 0016 e 0017). Há lobby em
// cada projeto de grupo (solo: false na project_session) do campus que a pessoa
// ainda não validou, inscrita ou não: a API não expõe os pré-requisitos. Entrar
// é o opt-in para revelar esse projeto a quem está no mesmo lobby e campus;
// antes de entrar vê-se só quantas pessoas lá estão. O POST /tavern/lobby segue o /pond/ducks: Origin da
// app, sessão do cookie, formulário validado. Sair funciona sempre.
import { z } from 'zod';

import { crossOrigin, getSession, type AuthDeps } from '../auth/handlers';
import type { PassportSnapshot } from '../passport/passport';

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

/**
 * Os projetos de grupo do catálogo do campus que a pessoa ainda não validou
 * (validated === true fecha o lobby; um falhado continua), pela ordem do
 * catálogo e com o nome do catálogo. Sem Passaporte sincronizado não há nenhum.
 */
export function lobbyProjects(
  snapshot: PassportSnapshot | null,
  catalog: readonly { slug: string; name: string; solo: boolean }[]
): LobbyProject[] {
  if (snapshot === null) return [];
  const status = new Map(snapshot.projects.map((p) => [p.slug, p]));
  return catalog.flatMap(({ slug, name, solo }) => {
    const project = status.get(slug);
    if (solo || project?.validated === true) return [];
    return [{ slug, name, suggested: project !== undefined && SUGGESTED.includes(project.status) }];
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
  return lobbyProjects(snapshot, await deps.catalog(campusId));
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
 * lobbyProjects → 403; join → cria ou renova e 303 /tavern/<slug>.
 */
export async function handleLobby(
  req: Request,
  deps: {
    auth: AuthDeps;
    isHidden(userId: string): Promise<boolean>;
    projectsOf(userId: string): Promise<LobbyProject[]>;
    store: {
      join(userId: string, slug: string): Promise<void>;
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
  await deps.store.join(userId, project);
  return seeOther(`/tavern/${project}`);
}
