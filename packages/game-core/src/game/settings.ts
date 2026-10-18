export type Locale = 'es-AR' | 'en';

/** Ajustes de simulación. Unidades: metros, m/s, m/s², radianes. */
export interface GameSettings {
  locale: Locale;
  lookSensitivity: number;
  invertY: boolean;
  walkSpeed: number;
  runSpeed: number;
  crouchSpeed: number;
  jumpSpeed: number;
  gravity: number;
  playerHeight: number;
  crouchHeight: number;
  playerRadius: number;
  /** Altura de los ojos como fracción de la altura actual (parado o agachado). */
  eyeHeightRatio: number;
  interactRange: number;
}

export const DEFAULT_GAME_SETTINGS: Readonly<GameSettings> = {
  locale: 'es-AR',
  lookSensitivity: 1,
  invertY: false,
  walkSpeed: 4,
  runSpeed: 7,
  crouchSpeed: 2,
  jumpSpeed: 4.5,
  gravity: -20,
  playerHeight: 1.8,
  crouchHeight: 1.2,
  playerRadius: 0.35,
  eyeHeightRatio: 0.9,
  interactRange: 2.5,
};

export const MAX_HEALTH = 100;
