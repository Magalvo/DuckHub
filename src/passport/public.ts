// Vista pública do Passaporte (WI-0009, ADR 0010): o que a comunidade vê. Só o
// positivo: sem os projetos falhados e em curso e sem a data da sincronização.
// A filtragem faz-se aqui, no servidor, antes de render: o que não se mostra
// nunca chega ao HTML.
import type { PassportView } from './passport';

type Project = PassportView['projects'][number];
type DoneProject = Project & { state: 'done' };

/** O que a comunidade vê: sem syncedAt e só com os projetos validados. */
export type PublicPassportView = Omit<PassportView, 'syncedAt' | 'projects'> & {
  projects: DoneProject[];
};

const isDone = (p: Project): p is DoneProject => p.state === 'done';

/**
 * Lista de campos permitidos, não de proibidos: um campo novo no PassportView
 * só chega à comunidade quando alguém o acrescenta aqui de propósito.
 */
export function publicPassportView(view: PassportView): PublicPassportView {
  return {
    login: view.login,
    initials: view.initials,
    avatarText: view.avatarText,
    campus: view.campus,
    piscine: view.piscine,
    isAlumni: view.isAlumni,
    coalitionName: view.coalitionName,
    accentColor: view.accentColor,
    reduced: view.reduced,
    mainCursus: view.mainCursus,
    projects: view.projects.filter(isDone),
    badges: view.badges, // WI-0011: positivas por construção (ADR 0011)
    skills: view.skills, // WI-0019: verificáveis, como o nível
  };
}
