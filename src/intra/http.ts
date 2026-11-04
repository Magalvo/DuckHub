// Parsing de headers HTTP da API da 42. Funções puras, sem rede.

/** URL da relação "next" de um header Link (RFC 8288), ou null se não houver. */
export function nextLink(header: string | null): string | null {
  if (header === null) return null;
  for (const part of header.split(',')) {
    const match = /^\s*<([^>]*)>(.*)$/.exec(part);
    if (match === null) continue;
    const [, url = '', params = ''] = match;
    const rel = /;\s*rel\s*=\s*(?:"([^"]*)"|([^\s;]+))/i.exec(params);
    const values = (rel?.[1] ?? rel?.[2] ?? '').toLowerCase().split(/\s+/);
    if (values.includes('next')) return url;
  }
  return null;
}

/**
 * Espera pedida por um Retry-After em segundos, em ms; null se ausente ou
 * inválido. O formato de data HTTP conta como ausente: compará-lo exigiria a
 * hora real, e o Clock injetado não a dá (a 42 nem documenta o header).
 */
export function retryAfterMs(header: string | null): number | null {
  if (header === null) return null;
  const value = header.trim();
  return /^\d+$/.test(value) ? Number(value) * 1000 : null;
}
