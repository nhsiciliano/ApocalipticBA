import assert from 'node:assert/strict';
import { test } from 'node:test';

import { base, createConfig, node } from '../eslint.config.js';
import prettierConfig from '../prettier.config.js';

test('los presets de ESLint son arrays de config flat no vacíos', () => {
  assert.ok(Array.isArray(base) && base.length > 0);
  assert.ok(Array.isArray(node) && node.length > base.length - 1);
});

test('createConfig deja Prettier como último bloque', () => {
  const [last] = createConfig({ rules: { 'no-console': 'warn' } }).slice(-1);
  assert.ok(last);
  assert.equal(last.rules?.['no-console'], undefined);
  assert.equal(last.rules?.['max-len'], 0);
});

test('Prettier usa el estilo del proyecto', () => {
  assert.deepEqual(prettierConfig, {
    singleQuote: true,
    semi: true,
    trailingComma: 'all',
    printWidth: 100,
  });
});
