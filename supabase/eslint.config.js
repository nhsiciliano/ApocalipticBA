import { createConfig } from '@apocalipticba/config/eslint';
import globals from 'globals';

/**
 * Las Edge Functions corren en Deno: se lintean con las reglas comunes pero sin globals de Node
 * (su tsconfig, `functions/tsconfig.json`, tampoco los tiene). Tests y scripts corren en Node.
 */
export default createConfig({
  files: ['tests/**/*.ts', 'scripts/**/*.mjs', '*.{js,ts}'],
  languageOptions: { globals: globals.node },
});
