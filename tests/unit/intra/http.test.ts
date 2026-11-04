import { describe, expect, it } from 'vitest';

import { nextLink, retryAfterMs } from '../../../src/intra/http.js';

const base = 'https://api.intra.42.fr/v2/users/1/projects_users';

describe('nextLink', () => {
  it('devolve o URL de rel="next", em qualquer posição', () => {
    expect(nextLink(`<${base}?page=2>; rel="next", <${base}?page=9>; rel="last"`)).toBe(
      `${base}?page=2`
    );
    expect(nextLink(`<${base}?page=1>; rel="prev", <${base}?page=3>; rel="next"`)).toBe(
      `${base}?page=3`
    );
  });

  it('aceita rel sem aspas, com vários valores e maiúsculas', () => {
    expect(nextLink(`<${base}?page=2>; rel=next`)).toBe(`${base}?page=2`);
    expect(nextLink(`<${base}?page=2>; rel="last NEXT"`)).toBe(`${base}?page=2`);
  });

  it('não confunde next com outras relações', () => {
    expect(nextLink(`<${base}?page=1>; rel="first", <${base}?page=2>; rel="prev"`)).toBeNull();
    expect(nextLink(`<${base}?page=2>; rel="nextish"`)).toBeNull();
  });

  it('sem header ou com header mal formado, não há próxima página', () => {
    expect(nextLink(null)).toBeNull();
    expect(nextLink('')).toBeNull();
    expect(nextLink('rel="next"')).toBeNull();
  });
});

describe('retryAfterMs', () => {
  it('em segundos', () => {
    expect(retryAfterMs('7')).toBe(7000);
    expect(retryAfterMs(' 0 ')).toBe(0);
  });

  it('uma data HTTP conta como ausente: o Clock não é a hora real', () => {
    expect(retryAfterMs('Wed, 04 Nov 2026 12:00:30 GMT')).toBeNull();
  });

  it('ausente ou inválido dá null', () => {
    expect(retryAfterMs(null)).toBeNull();
    expect(retryAfterMs('')).toBeNull();
    expect(retryAfterMs('-5')).toBeNull();
    expect(retryAfterMs('1.5')).toBeNull();
    expect(retryAfterMs('amanhã')).toBeNull();
  });
});
