/**
 * Paleta del meteorito: el único color saturado y emisivo del juego, siempre se lee como
 * "contaminación". La sangre es mate y nunca emisiva. Ver docs/decisions/ADR-005.
 */
export const METEORITE_PALETTE = {
  /** Núcleo emisivo. */
  core: '#FF3B1F',
  /** Glow / halo. */
  glow: '#FF6A3D',
  /** Medio: vetas y grietas. */
  mid: '#C4160C',
  /** Oscuro: zonas quemadas. */
  dark: '#4A0806',
  /** Tinte de cielo y niebla post-impacto. */
  skyTint: '#8A3A2E',
  skyTintOpacity: 0.35,
  /** Sangre: rojo oscuro y mate. */
  blood: '#5C0F0F',
  /** Período del pulso de brillo, para que el meteorito se distinga también por luminancia. */
  pulsePeriodMs: 1500,
} as const;

export type MeteoritePalette = typeof METEORITE_PALETTE;
