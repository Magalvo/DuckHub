// routeTemplate (WI-0025, ADR 0019) para lá do contrato: casos-limite do
// pathname. Dados inventados.
import { describe, expect, it } from 'vitest';

import { routeTemplate } from '../../../src/analytics/routes.js';

describe('routeTemplate — casos-limite', () => {
  it.each([
    ['', '/other'],
    ['?q=x', '/other'],
    ['#topo', '/other'],
    ['//', '/other'],
    ['/u', '/other'],
    ['/u/', '/other'],
    ['/u//', '/other'],
    ['/tavern/', '/tavern'],
    ['/tavern/profile/', '/tavern/profile'],
    ['/tavern/profile?x=1', '/tavern/profile'],
    ['/tavern/webserv/extra', '/other'],
    ['/pond#fim', '/pond'],
    ['community', '/other'],
    ['/Community', '/other'],
  ])('%j → %s', (pathname, template) => {
    expect(routeTemplate(pathname)).toBe(template);
  });
});
