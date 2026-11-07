// Compatibilidade (WI-0014, ADR 0015) para lá do contrato: o meio que só
// aparece depois de renormalizar os pesos e os períodos repetidos dos dois
// lados. Dados inventados.
import { describe, expect, it } from 'vitest';

import { compatibility, rankCandidates } from '../../../src/tavern/compatibility.js';

describe('compatibility — arredondamento depois de renormalizar', () => {
  it('5 pontos em 40 (12,5) arredonda para 13', () => {
    const { score } = compatibility(
      { login: 'pato-a', start: 'this-week', pace: 'sprint', style: 'pair' },
      { login: 'pato-b', start: 'no-rush', pace: 'steady', style: 'split' }
    );
    expect(score).toBe(13);
  });

  it('15 pontos em 40 (37,5) arredonda para 38', () => {
    const { score } = compatibility(
      { login: 'pato-a', start: 'this-week', pace: 'sprint', style: 'pair' },
      { login: 'pato-b', start: 'no-rush', pace: 'steady', style: 'pair' }
    );
    expect(score).toBe(38);
  });

  it('dois terços de sobreposição no horário (66,7) ficam em 67, com repetidos dos dois lados', () => {
    const { score } = compatibility(
      { login: 'pato-a', periods: ['morning', 'afternoon', 'afternoon', 'evening'] },
      { login: 'pato-b', periods: ['evening', 'night', 'afternoon', 'night'] }
    );
    expect(score).toBe(67);
  });

  it('dois terços no horário com começar igual: (25·⅔ + 20) / 45 = 81,48 → 81', () => {
    const { score } = compatibility(
      { login: 'pato-a', periods: ['morning', 'afternoon', 'evening'], start: 'no-rush' },
      { login: 'pato-b', periods: ['afternoon', 'evening', 'night'], start: 'no-rush' }
    );
    expect(score).toBe(81);
  });

  it('periods só com repetidos de um período conta como um período', () => {
    const { score, reasons } = compatibility(
      { login: 'pato-a', periods: ['night', 'night', 'night'] },
      { login: 'pato-b', periods: ['morning', 'night'] }
    );
    expect(score).toBe(100);
    expect(reasons).toEqual(['shared-hours']);
  });
});

describe('rankCandidates', () => {
  it('sem candidatos devolve uma lista vazia', () => {
    expect(rankCandidates({ login: 'pato-a' }, [])).toEqual([]);
  });

  it('quem não tem nada em comum aparece no fim, com 0', () => {
    const ranked = rankCandidates({ login: 'pato-a', pace: 'sprint' }, [
      { login: 'pato-b' },
      { login: 'pato-c', pace: 'sprint' },
    ]);
    expect(ranked.map((r) => [r.login, r.compatibility.score])).toEqual([
      ['pato-c', 100],
      ['pato-b', 0],
    ]);
  });
});
