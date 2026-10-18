import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import importX from 'eslint-plugin-import-x';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Punto de extensión: `createConfig(...extra)` arma una config completa con las reglas comunes,
 * los bloques `extra` del consumidor y Prettier al final (así nunca lo pisa otra regla).
 * Los presets de Astro (Hito 5) y React Native (Hito 6) se agregan acá como nuevos exports que
 * llaman a `createConfig`.
 *
 * @param {...import('eslint/config').Config} extra
 */
export function createConfig(...extra) {
  return defineConfig(
    globalIgnores([
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/.astro/**',
      '**/.expo/**',
    ]),
    js.configs.recommended,
    tseslint.configs.recommendedTypeChecked,
    tseslint.configs.stylisticTypeChecked,
    {
      languageOptions: {
        parserOptions: { projectService: true },
      },
    },
    {
      // Los archivos JS (configs, scripts) no pertenecen a ningún tsconfig: sin reglas con tipos.
      files: ['**/*.{js,mjs,cjs}'],
      extends: [tseslint.configs.disableTypeChecked],
    },
    {
      plugins: { 'import-x': importX },
      rules: {
        '@typescript-eslint/consistent-type-imports': 'error',
        'import-x/no-duplicates': 'error',
        'import-x/order': [
          'error',
          {
            groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
            'newlines-between': 'always',
            alphabetize: { order: 'asc', caseInsensitive: true },
          },
        ],
      },
    },
    ...extra,
    prettier,
  );
}

/** Preset base: TypeScript estricto sin entorno específico (código compartido). */
export const base = createConfig();

/** Preset Node: scripts, herramientas y paquetes que corren en Node. */
export const node = createConfig({
  files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
  languageOptions: { globals: globals.node },
});

export default base;
