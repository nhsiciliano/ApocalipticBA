import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ROUTES, routeFileName } from './routes.ts';

const APP_DIR = join(import.meta.dirname, '../../app');

describe('ROUTES', () => {
  it('has a screen file for every route', () => {
    for (const path of Object.values(ROUTES)) {
      expect(existsSync(join(APP_DIR, routeFileName(path))), path).toBe(true);
    }
  });

  it('uses unique, absolute, kebab-case paths', () => {
    const paths = Object.values(ROUTES);
    expect(new Set(paths).size).toBe(paths.length);
    for (const path of paths) expect(path).toMatch(/^\/([a-z]+(-[a-z]+)*)?$/);
  });
});
