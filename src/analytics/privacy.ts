// O before_send do PostHog (WI-0025, ADR 0019): nenhum URL, pathname,
// referrer nem query string sai do browser. Puro.

/** As propriedades que saem sempre (AC4). */
export const DENIED_PROPERTIES: readonly string[] = [
  '$current_url',
  '$pathname',
  '$referrer',
  '$referring_domain',
];

/**
 * As que começam por estes prefixos saem também. O $session_entry_* levava o
 * URL de entrada, com o login (e2e de 2026-11-10).
 */
export const DENIED_PREFIXES: readonly string[] = [
  '$initial_',
  '$session_entry_',
  '$prev_pageview_',
];

function denied(key: string): boolean {
  return DENIED_PROPERTIES.includes(key) || DENIED_PREFIXES.some((p) => key.startsWith(p));
}

function clean(bag: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(bag)) {
    if (denied(key)) continue;
    out[key] = typeof value === 'string' ? value.split('?', 1)[0] : value;
  }
  return out;
}

/** O before_send (AC4). Puro: devolve um evento novo. */
export function stripPersonalData<
  E extends {
    properties: Record<string, unknown>;
    $set?: Record<string, unknown>;
    $set_once?: Record<string, unknown>;
  },
>(event: E): E {
  const out: E = { ...event, properties: clean(event.properties) };
  if (event.$set !== undefined) out.$set = clean(event.$set);
  if (event.$set_once !== undefined) out.$set_once = clean(event.$set_once);
  return out;
}
