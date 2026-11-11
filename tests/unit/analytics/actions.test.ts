// actionEvent (WI-0025, ADR 0019): o formulário submetido → o evento da ação.
// Os campos incluem o botão que submeteu (FormData com event.submitter).
// Dados inventados.
import { describe, expect, it } from 'vitest';

import { actionEvent } from '../../../src/analytics/actions.js';

describe('actionEvent', () => {
  it.each<[string, Record<string, string>, string, Record<string, string>]>([
    ['/auth/logout', {}, 'auth_logout_requested', {}],
    ['/account/delete', {}, 'account_deletion_requested', {}],
    [
      '/account/visibility',
      { hidden: 'true' },
      'passport_visibility_changed',
      { visibility: 'hidden' },
    ],
    [
      '/account/visibility',
      { hidden: 'false' },
      'passport_visibility_changed',
      { visibility: 'visible' },
    ],
    ['/pond/ducks', { duck: 'give', event: '7' }, 'duck_reaction_changed', { action: 'give' }],
    ['/pond/ducks', { duck: 'take' }, 'duck_reaction_changed', { action: 'take' }],
    [
      '/tavern/lobby',
      { intent: 'join', slug: 'webserv' },
      'tavern_lobby_membership_changed',
      { action: 'join' },
    ],
    ['/tavern/lobby', { intent: 'leave' }, 'tavern_lobby_membership_changed', { action: 'leave' }],
    ['/tavern/profile/answers', { intent: 'save', periods: 'manha' }, 'work_profile_saved', {}],
    ['/tavern/profile/answers', { intent: 'delete' }, 'work_profile_deleted', {}],
  ])('%s com %j → %s', (action, fields, name, properties) => {
    expect(actionEvent(action, fields)).toEqual({ name, properties });
  });

  it.each<[string, Record<string, string>]>([
    ['/community', { q: 'pato-teste' }],
    ['/calculator', {}],
    ['/account/visibility', {}],
    ['/account/visibility', { hidden: 'talvez' }],
    ['/pond/ducks', {}],
    ['/pond/ducks', { duck: 'roubar' }],
    ['/tavern/lobby', { intent: 'kick' }],
    ['/tavern/profile/answers', {}],
    ['/tavern/profile/answers', { intent: 'apagar' }],
    ['/nao-existe', { intent: 'save' }],
  ])('%s com %j → null', (action, fields) => {
    expect(actionEvent(action, fields)).toBeNull();
  });

  it('nunca leva os outros campos do formulário', () => {
    const out = actionEvent('/tavern/lobby', {
      intent: 'join',
      slug: 'webserv',
      login: 'pato-teste',
    });
    expect(JSON.stringify(out)).not.toContain('webserv');
    expect(JSON.stringify(out)).not.toContain('pato-teste');
  });
});
