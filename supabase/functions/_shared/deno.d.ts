// Subconjunto de la API global de Deno que usan los `index.ts`, para chequear tipos con tsc sin
// instalar Deno. Los handlers no tocan `Deno`: reciben todo inyectado.
declare namespace Deno {
  interface Env {
    get(key: string): string | undefined;
  }
  const env: Env;
  function serve(handler: (request: Request) => Response | Promise<Response>): unknown;
}
