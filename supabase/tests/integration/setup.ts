import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { TestProject } from 'vitest/node';

export interface LocalStack {
  apiUrl: string;
  functionsUrl: string;
  /** Clave publicable (rol anon). */
  anonKey: string;
  /** Clave secreta (service role, bypassa RLS). */
  serviceKey: string;
  allowedOrigin: string;
}

declare module 'vitest' {
  export interface ProvidedContext {
    /** `null` si el stack local no está arriba: los tests se saltean. */
    stack: LocalStack | null;
  }
}

const WORKDIR = '..';
const ALLOWED_ORIGIN = 'http://localhost:4321';

/** Lee las URLs y claves de `supabase status -o env`: nunca hay claves en el repo. */
function readStatus(): Record<string, string> | null {
  const result = spawnSync('supabase', ['status', '-o', 'env', '--workdir', WORKDIR], {
    encoding: 'utf8',
  });
  if (result.status !== 0) return null;
  const values: Record<string, string> = {};
  for (const line of result.stdout.split('\n')) {
    const match = /^([A-Z0-9_]+)="?(.*?)"?$/.exec(line.trim());
    if (match?.[1] !== undefined && match[2] !== undefined) values[match[1]] = match[2];
  }
  return values;
}

async function reachable(url: string): Promise<boolean> {
  try {
    await fetch(url, { signal: AbortSignal.timeout(3000) });
    return true;
  } catch {
    return false;
  }
}

/** Espera a que `functions serve` anuncie las funciones y responda (GET → 405 del handler). */
async function waitForFunctions(child: ChildProcess, stack: LocalStack): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => {
      reject(new Error(`functions serve did not start:\n${output}`));
    }, 90_000);
    const onData = (chunk: Buffer) => {
      output += chunk.toString();
      if (output.includes('Serving functions on')) {
        clearTimeout(timer);
        resolve();
      }
    };
    child.stdout?.on('data', onData);
    child.stderr?.on('data', onData);
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`functions serve exited with ${String(code)}:\n${output}`));
    });
  });
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${stack.functionsUrl}/waitlist-signup`, {
        headers: { apikey: stack.anonKey },
      });
      if (response.status === 405) return;
    } catch {
      // El runtime todavía está arrancando.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('waitlist-signup did not become ready');
}

export default async function setup(project: TestProject) {
  const status = readStatus();
  const apiUrl = status?.API_URL;
  const anonKey = status?.PUBLISHABLE_KEY ?? status?.ANON_KEY;
  const serviceKey = status?.SECRET_KEY ?? status?.SERVICE_ROLE_KEY;
  if (
    apiUrl === undefined ||
    anonKey === undefined ||
    serviceKey === undefined ||
    !(await reachable(`${apiUrl}/rest/v1/`))
  ) {
    console.warn('Supabase local no responde: se saltean los tests de integración.');
    project.provide('stack', null);
    return;
  }

  const stack: LocalStack = {
    apiUrl,
    functionsUrl: `${apiUrl}/functions/v1`,
    anonKey,
    serviceKey,
    allowedOrigin: ALLOWED_ORIGIN,
  };

  // Env propio para las funciones: sal aleatoria por corrida, así los contadores de rate limit
  // de corridas anteriores no interfieren.
  const dir = await mkdtemp(join(tmpdir(), 'apocalipticba-functions-'));
  const envFile = join(dir, '.env');
  await writeFile(
    envFile,
    `ALLOWED_ORIGINS=${ALLOWED_ORIGIN}\nRATE_LIMIT_SALT=${randomBytes(24).toString('hex')}\n`,
  );
  const child = spawn(
    'supabase',
    ['functions', 'serve', '--workdir', WORKDIR, '--env-file', envFile],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  await waitForFunctions(child, stack);
  project.provide('stack', stack);

  return async () => {
    if (child.exitCode === null) {
      const exited = new Promise((resolve) => child.once('exit', resolve));
      child.kill('SIGINT');
      await exited;
    }
    await rm(dir, { recursive: true, force: true });
  };
}
