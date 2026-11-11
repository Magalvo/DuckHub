// Quando e como o PostHog arranca (WI-0025, ADR 0019): só na UE (ou num host
// local fora de produção), sem armazenamento, sem captura automática, anónimo.
import type { PostHogConfig } from 'posthog-js';

import { stripPersonalData } from './privacy';

export const POSTHOG_EU_HOST = 'https://eu.i.posthog.com';

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1']);

function acceptedHost(host: string, production: boolean): boolean {
  if (host === POSTHOG_EU_HOST) return true;
  if (production) return false;
  let url: URL;
  try {
    url = new URL(host);
  } catch {
    return false;
  }
  return (
    (url.protocol === 'http:' || url.protocol === 'https:') && LOCAL_HOSTNAMES.has(url.hostname)
  );
}

/**
 * null sem chave (AC1) ou com um host não aceite (AC2). Um host vazio ou
 * indefinido é o da UE. `production` vem de process.env.NODE_ENV.
 */
export function posthogConfig(env: {
  key: string | undefined;
  host: string | undefined;
  production: boolean;
}): { key: string; options: Partial<PostHogConfig> } | null {
  const key = env.key?.trim() ?? '';
  if (key === '') return null;
  const host = env.host === undefined || env.host.trim() === '' ? POSTHOG_EU_HOST : env.host.trim();
  if (!acceptedHost(host, env.production)) return null;
  return {
    key,
    options: {
      api_host: host,
      persistence: 'memory',
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      capture_performance: false,
      disable_surveys: true,
      capture_exceptions: false,
      person_profiles: 'never',
      respect_dnt: true,
      advanced_disable_flags: true,
      disable_external_dependency_loading: true,
      disable_web_experiments: true,
      disable_product_tours: true,
      capture_dead_clicks: false,
      capture_heatmaps: false,
      rageclick: false,
      save_referrer: false,
      before_send: stripPersonalData,
    },
  };
}
