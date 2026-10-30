// Idioma ativo. Só há inglês por agora; um segundo idioma entra aqui com o
// mesmo tipo `Messages`.
import { en } from './messages/en.js';

export type { Messages } from './messages/en.js';

export const messages = en;
