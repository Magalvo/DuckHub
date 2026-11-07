// tests/acceptance/wi-0018-lobbies-abertos.acceptance.test.ts
//
// Rascunho preparado pelo Claude a pedido do humano, com as decisões do humano
// de 2026-11-07: os lobbies abrem-se a todos os projetos de grupo que a pessoa
// ainda não validou (a API não expõe os pré-requisitos: as regras das sessions
// dão 403 com o token da aplicação); antes de entrar vê-se só quantas pessoas
// estão no lobby. As regras de quem tem lobby estão em
// wi-0017-lobby.acceptance.test.ts; o resto em e2e/wi-0018.e2e.ts. Revê antes
// do commit: depois de entrar, isto é o contrato.
import { describe, expect, it } from 'vitest';

import { en } from '../../src/i18n/messages/en.js';
import { lookingLabel } from '../../src/tavern/lobby.js';

describe('WI-0018 — quantas pessoas estão no lobby', () => {
  const { lookingOne, lookingMany } = en.tavern.lobby;

  it('AC2: singular só para 1, com um espaço entre o número e a palavra', () => {
    expect(lookingLabel(0, lookingOne, lookingMany)).toBe(`0 ${lookingMany}`);
    expect(lookingLabel(1, lookingOne, lookingMany)).toBe(`1 ${lookingOne}`);
    expect(lookingLabel(2, lookingOne, lookingMany)).toBe(`2 ${lookingMany}`);
    expect(lookingLabel(14, lookingOne, lookingMany)).toBe(`14 ${lookingMany}`);
  });

  it('AC2: os textos existem e são diferentes', () => {
    expect(lookingOne.trim()).not.toBe('');
    expect(lookingMany.trim()).not.toBe('');
    expect(lookingOne).not.toBe(lookingMany);
    expect(en.tavern.lobby.create.trim()).not.toBe('');
    expect(en.tavern.lobby.create).not.toBe(en.tavern.lobby.join);
  });
});
