// O formulário submetido → o evento da ação (WI-0025, ADR 0019). Os campos
// incluem o botão que submeteu. Só se olha para o campo que diz a ação; nada
// mais do formulário entra no evento. Puro.
import { analyticsEvent, type AnalyticsEvent } from './events';

/** O evento da ação de um formulário, ou null se não for uma ação medida. */
export function actionEvent(
  action: string,
  fields: Readonly<Record<string, string>>
): AnalyticsEvent | null {
  switch (action) {
    case '/auth/logout':
      return analyticsEvent('auth_logout_requested');
    case '/account/delete':
      return analyticsEvent('account_deletion_requested');
    case '/account/visibility': {
      const visibility =
        fields.hidden === 'true' ? 'hidden' : fields.hidden === 'false' ? 'visible' : undefined;
      return analyticsEvent('passport_visibility_changed', { visibility });
    }
    case '/pond/ducks':
      return analyticsEvent('duck_reaction_changed', { action: fields.duck });
    case '/tavern/lobby':
      return analyticsEvent('tavern_lobby_membership_changed', { action: fields.intent });
    case '/tavern/profile/answers':
      if (fields.intent === 'save') return analyticsEvent('work_profile_saved');
      if (fields.intent === 'delete') return analyticsEvent('work_profile_deleted');
      return null;
    default:
      return null;
  }
}
