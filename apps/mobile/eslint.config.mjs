import { createConfig } from '@apocalipticba/config/eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

const tsFiles = ['**/*.{ts,tsx}'];

// eslint-plugin-react 7.x todavía no corre en ESLint 10 (usa context.getFilename): queda afuera.
export default createConfig(
  { files: tsFiles, ...reactHooks.configs.flat.recommended },
  {
    files: tsFiles,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'three',
              message: "Importá desde 'three/webgpu' o 'three/tsl' (AGENTS.md).",
            },
            {
              name: '@react-three/fiber/native',
              message:
                'El bundle nativo de R3F no se usa: GameCanvas monta R3F con createRoot sobre el bundle web (ADR-008).',
            },
          ],
        },
      ],
    },
  },
  {
    // Configs de Metro y Babel: CommonJS porque Expo las carga con require().
    files: ['*.js', '*.cjs'],
    languageOptions: { globals: globals.node },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
);
