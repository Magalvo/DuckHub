// Diretório (WI-0010, ADR 0012) para lá do contrato: os parâmetros da query, o
// padrão do ILIKE e o item mostrado. Dados inventados.
import { describe, expect, it } from 'vitest';

import {
  directoryItem,
  likePattern,
  parseDirectoryQuery,
  resolveCampus,
} from '../../../src/community/directory.js';
import { passportView, type PassportSnapshot } from '../../../src/passport/passport.js';
import { publicPassportView } from '../../../src/passport/public.js';

const snapshot: PassportSnapshot = {
  login: 'pato-teste',
  campus: 'Campus Sintético',
  piscine: { month: 'september', year: 2023 },
  isAlumni: true,
  coalition: { name: 'Os Patos', color: '#0E12B5' },
  cursus: [{ slug: '42cursus', name: '42cursus', level: 5.179 }],
  projects: [
    { slug: 'p1', name: 'P1', status: 'finished', finalMark: 42, validated: false },
    { slug: 'p2', name: 'P2', status: 'finished', finalMark: 125, validated: true },
  ],
};

describe('parseDirectoryQuery', () => {
  it('sem parâmetros: página 1, sem procura, todos os campus', () => {
    expect(parseDirectoryQuery({})).toEqual({ q: null, campusId: null, page: 1, tooLong: false });
  });

  it.each(['abc', '0', '-1', '1.5', '1e2', '10001', '', ' 2'])('page=%j conta como 1', (page) => {
    expect(parseDirectoryQuery({ page }).page).toBe(1);
  });

  it.each([
    ['2', 2],
    ['10000', 10000],
  ])('page=%s é válida', (page, expected) => {
    expect(parseDirectoryQuery({ page }).page).toBe(expected);
  });

  it.each(['abc', '0', '-1', '1.5', '', '9002x', '99999999999'])(
    'campus=%j é ignorado',
    (campus) => {
      expect(parseDirectoryQuery({ campus }).campusId).toBeNull();
    }
  );

  it('campus=9002 filtra', () => {
    expect(parseDirectoryQuery({ campus: '9002' }).campusId).toBe(9002);
  });

  it('q tira os espaços das pontas; vazio é sem procura', () => {
    expect(parseDirectoryQuery({ q: '  pato ' }).q).toBe('pato');
    expect(parseDirectoryQuery({ q: '   ' }).q).toBeNull();
  });

  it('q com mais de 32 caracteres não se corta: marca-se tooLong', () => {
    const long = 'a'.repeat(33);
    expect(parseDirectoryQuery({ q: long })).toMatchObject({ q: long, tooLong: true });
    expect(parseDirectoryQuery({ q: 'a'.repeat(32) }).tooLong).toBe(false);
  });

  it('um parâmetro repetido conta pelo primeiro valor', () => {
    expect(parseDirectoryQuery({ q: ['pato', 'marreco'], page: ['2', '3'] })).toMatchObject({
      q: 'pato',
      page: 2,
    });
  });
});

describe('resolveCampus', () => {
  const options = [{ id: 9001, name: 'Campus Sintético' }];
  it('um campus que não está nas opções é ignorado', () => {
    expect(resolveCampus(9999, options)).toBeNull();
    expect(resolveCampus(9001, options)).toBe(9001);
    expect(resolveCampus(null, options)).toBeNull();
  });
});

describe('likePattern', () => {
  it.each([
    ['pato', '%pato%'],
    ['%', '%\\%%'],
    ['_', '%\\_%'],
    ['\\', '%\\\\%'],
    ['a\\%_b', '%a\\\\\\%\\_b%'],
  ])('%j → %j', (q, pattern) => {
    expect(likePattern(q)).toBe(pattern);
  });
});

describe('directoryItem', () => {
  it('só login, avatar, campus e nível mostrado', () => {
    const item = directoryItem(snapshot, Date.UTC(2026, 6, 15));
    const view = publicPassportView(passportView(snapshot, Date.UTC(2026, 6, 15)));
    expect(item).toEqual({
      login: 'pato-teste',
      initials: view.initials,
      avatarText: view.avatarText,
      accentColor: '#0E12B5',
      campus: 'Campus Sintético',
      level: '5.17',
    });
    const json = JSON.stringify(item);
    for (const hidden of ['p1', 'p2', 'september', 'Os Patos', '2026']) {
      expect(json).not.toContain(hidden);
    }
  });

  it('sem cursus, sem nível', () => {
    expect(directoryItem({ ...snapshot, cursus: [] }, 0).level).toBeNull();
  });
});
