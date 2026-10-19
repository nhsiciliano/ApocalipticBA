/**
 * Rutas de la navegación placeholder (Hito 6). Cada entrada es un archivo en `app/`.
 * Las pantallas reales llegan con el HUD (Hito 9) y las pantallas de meta (Fase 1).
 */
export const ROUTES = {
  home: '/',
  menu: '/menu',
  scenarios: '/scenarios',
  play: '/play',
  pause: '/pause',
  gameOver: '/game-over',
  summary: '/summary',
  journal: '/journal',
  ranking: '/ranking',
  profile: '/profile',
  settings: '/settings',
  login: '/login',
} as const;

export type RouteKey = keyof typeof ROUTES;
export type RoutePath = (typeof ROUTES)[RouteKey];

/** Nombre del archivo en `app/` que atiende cada ruta (para validar la estructura en tests). */
export function routeFileName(path: RoutePath): string {
  return path === '/' ? 'index.tsx' : `${path.slice(1)}.tsx`;
}
