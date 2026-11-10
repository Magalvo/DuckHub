// PostHog no browser (WI-0025, ADR 0019). Só arranca quando posthogConfig
// devolve uma configuração; sem chave, ou com um host não aceite, não faz
// nada e nada falha. Nunca se identifica ninguém.
import posthog from 'posthog-js';

import { posthogConfig } from './analytics/config';

const config = posthogConfig({
  key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  production: process.env.NODE_ENV === 'production',
});

if (config !== null) posthog.init(config.key, config.options);
