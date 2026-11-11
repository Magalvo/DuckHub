// A lista fechada de eventos do ADR 0019 (WI-0025). Cada evento tem um schema
// Zod estrito com valores fixos: nunca logins, nomes, slugs, texto nem URLs.
import { z } from 'zod';

import { OTHER_ROUTE, ROUTE_TEMPLATES } from './routes';

const route = z.string().refine((r) => r === OTHER_ROUTE || ROUTE_TEMPLATES.includes(r));
const none = z.object({}).strict();

const SCHEMAS = {
  page_viewed: z.object({ route }).strict(),
  auth_login_started: none,
  auth_logout_requested: none,
  account_deletion_requested: none,
  passport_visibility_changed: z.object({ visibility: z.enum(['hidden', 'visible']) }).strict(),
  duck_reaction_changed: z.object({ action: z.enum(['give', 'take']) }).strict(),
  tavern_lobby_membership_changed: z.object({ action: z.enum(['join', 'leave']) }).strict(),
  work_profile_saved: none,
  work_profile_deleted: none,
} satisfies Record<string, z.ZodType<Record<string, string>>>;

type EventName = keyof typeof SCHEMAS;

/** Os 9 eventos do ADR 0019, por esta ordem. */
export const ANALYTICS_EVENTS: readonly string[] = Object.keys(SCHEMAS);

function isEventName(name: string): name is EventName {
  return Object.hasOwn(SCHEMAS, name);
}

export interface AnalyticsEvent {
  readonly name: string;
  readonly properties: Record<string, string>;
}

/** O evento validado com Zod, ou null (AC5). */
export function analyticsEvent(
  name: string,
  properties?: Record<string, unknown>
): { name: string; properties: Record<string, string> } | null {
  if (!isEventName(name)) return null;
  const parsed = SCHEMAS[name].safeParse(properties ?? {});
  return parsed.success ? { name, properties: parsed.data } : null;
}
