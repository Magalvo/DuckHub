// Feed do Duck Pond (WI-0012, ADR 0013) para lá do contrato: a página, o dia
// mostrado e o que se mostra de cada evento. Dados inventados.
import { describe, expect, it } from 'vitest';

import { duckCount, formatDay, parsePondPage, pondHref, pondItem } from '../../../src/pond/feed.js';

const row = {
  id: 7,
  login: 'pato-teste',
  createdAt: Date.UTC(2026, 10, 5, 12, 0),
  ducks: 2,
  ducked: true,
  own: false,
};

describe('parsePondPage', () => {
  it.each([undefined, 'abc', '0', '-1', '1.5', '1e2', '10001', '', ' 2'])(
    'page=%j conta como 1',
    (page) => {
      expect(parsePondPage({ page })).toBe(1);
    }
  );

  it('aceita uma página válida e, repetida, conta a primeira', () => {
    expect(parsePondPage({ page: '2' })).toBe(2);
    expect(parsePondPage({ page: ['3', '4'] })).toBe(3);
  });
});

describe('formatDay', () => {
  it('só o dia, na hora de Lisboa', () => {
    // 23:30 UTC no verão já é o dia seguinte em Lisboa (UTC+1).
    expect(formatDay(Date.UTC(2026, 6, 1, 23, 30))).toBe('2026-07-02');
    // No inverno, Lisboa está em UTC.
    expect(formatDay(Date.UTC(2026, 11, 1, 23, 30))).toBe('2026-12-01');
  });
});

describe('pondItem', () => {
  it('projeto: nome e nota', () => {
    const event = {
      kind: 'project-validated',
      slug: 'libft',
      name: 'Libft',
      finalMark: 100,
    } as const;
    expect(pondItem({ ...row, event })).toEqual({
      id: 7,
      login: 'pato-teste',
      day: '2026-11-05',
      event: { kind: 'project-validated', name: 'Libft', finalMark: 100 },
      ducks: { count: 2, given: true, own: false },
    });
  });

  it('nível: o número', () => {
    expect(pondItem({ ...row, event: { kind: 'level-up', level: 6 } })?.event).toEqual({
      kind: 'level-up',
      level: 6,
    });
  });

  it('badge: o nome vem do catálogo', () => {
    expect(pondItem({ ...row, event: { kind: 'badge', badgeId: 'alumni' } })?.event).toEqual({
      kind: 'badge',
      badgeName: '42 Alumni',
    });
  });

  it('uma badge que já não está no catálogo não aparece', () => {
    expect(pondItem({ ...row, event: { kind: 'badge', badgeId: 'retirada' } })).toBeNull();
  });
});

describe('Rubber Ducks', () => {
  const words = { countOne: 'Duck', countMany: 'Ducks' };

  it.each([
    [0, '0 Ducks'],
    [1, '1 Duck'],
    [2, '2 Ducks'],
    [1000, '1000 Ducks'],
  ])('%i → %j, com um espaço entre o número e a palavra', (n, text) => {
    expect(duckCount(n, words)).toBe(text);
  });

  it('pondHref: /pond na primeira página', () => {
    expect(pondHref(1)).toBe('/pond');
    expect(pondHref(3)).toBe('/pond?page=3');
  });
});
