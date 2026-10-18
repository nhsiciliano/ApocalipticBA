// Ejecuta un script de un paquete del workspace y falla con un mensaje claro si el paquete
// todavía no existe. `pnpm --filter` sin coincidencias termina en éxito (0) sin hacer nada, lo
// que haría pasar un placeholder como si hubiera corrido.
//
// Uso: node tools/run-workspace-script.mjs <paquete> <script> <hito> [args...]
import { spawnSync } from 'node:child_process';

const [pkg, script, hito, ...args] = process.argv.slice(2);

if (!pkg || !script || !hito) {
  console.error('Uso: node tools/run-workspace-script.mjs <paquete> <script> <hito> [args...]');
  process.exit(2);
}

const list = spawnSync('pnpm', ['ls', '-r', '--depth', '-1', '--json'], {
  encoding: 'utf8',
});
if (list.status !== 0) {
  process.stderr.write(list.stderr);
  console.error('No se pudo listar los paquetes del workspace.');
  process.exit(list.status ?? 1);
}

/** @type {{ name?: string }[]} */
const projects = JSON.parse(list.stdout);
if (!projects.some((project) => project.name === pkg)) {
  console.error(
    `✖ El paquete ${pkg} todavía no existe en el workspace (llega en el Hito ${hito}). ` +
      `No se puede correr "${script}".`,
  );
  process.exit(1);
}

const run = spawnSync('pnpm', ['--filter', pkg, 'run', script, ...args], { stdio: 'inherit' });
process.exit(run.status ?? 1);
