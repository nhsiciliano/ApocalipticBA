// Genera packages/shared/src/db/types.ts desde la base local (`supabase gen types`), le agrega un
// encabezado y lo formatea con Prettier. Requiere el stack arriba (`pnpm db:start`).
import { spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import * as prettier from 'prettier';

const target = fileURLToPath(new URL('../../packages/shared/src/db/types.ts', import.meta.url));

const result = spawnSync(
  'supabase',
  ['gen', 'types', 'typescript', '--local', '--schema', 'public', '--workdir', '..'],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
);
if (result.status !== 0 || result.stdout.trim().length === 0) {
  console.error('✖ supabase gen types falló. ¿Está el stack arriba? (pnpm db:start)');
  process.exit(result.status ?? 1);
}

const header = [
  '// Generado por `pnpm db:types` (supabase gen types) desde las migraciones. No editar a mano.',
  '/* eslint-disable */',
  '',
].join('\n');
const options = (await prettier.resolveConfig(target)) ?? {};
const formatted = await prettier.format(header + result.stdout, { ...options, filepath: target });
await writeFile(target, formatted);
console.log(`✔ ${target}`);
