/** Lector de variables de entorno inyectable (`Deno.env.get` en runtime, un objeto en tests). */
export type EnvReader = (name: string) => string | undefined;

/**
 * Clave de servicio. El runtime local inyecta `SUPABASE_SERVICE_ROLE_KEY`; los proyectos con las
 * claves nuevas exponen además `SUPABASE_SECRET_KEYS` (JSON con `default`).
 */
export function serviceRoleKey(env: EnvReader): string {
  const legacy = env('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy !== undefined && legacy.length > 0) return legacy;
  const secretKeys = env('SUPABASE_SECRET_KEYS');
  if (secretKeys !== undefined) {
    const parsed = JSON.parse(secretKeys) as Record<string, string | undefined>;
    if (parsed.default !== undefined) return parsed.default;
  }
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEYS');
}

export function requireEnv(env: EnvReader, name: string): string {
  const value = env(name);
  if (value === undefined || value.length === 0) throw new Error(`Missing env ${name}`);
  return value;
}
