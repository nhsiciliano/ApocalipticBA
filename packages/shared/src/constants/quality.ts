export interface QualitySettings {
  /** `hull`: inverted hull en personajes, viewmodel y props clave. `hull+sobel` agrega Sobel. */
  outlines: 'hull' | 'hull+sobel';
  bloom: boolean;
  /** `billboards`: planos aditivos sin bloom. `bloom`: bloom selectivo sobre emisivos. */
  glow: 'billboards' | 'bloom';
  maxAnimatedZombies: 12 | 20 | 30;
  renderScale: 0.75 | 0.85 | 1;
  /** Escala de resolución del pase Sobel; solo en calidad alta. */
  sobelScale?: 0.5;
}

export const QUALITY_LEVELS = {
  low: {
    outlines: 'hull',
    bloom: false,
    glow: 'billboards',
    maxAnimatedZombies: 12,
    renderScale: 0.75,
  },
  medium: {
    outlines: 'hull',
    bloom: false,
    glow: 'billboards',
    maxAnimatedZombies: 20,
    renderScale: 0.85,
  },
  high: {
    outlines: 'hull+sobel',
    bloom: true,
    glow: 'bloom',
    maxAnimatedZombies: 30,
    renderScale: 1,
    sobelScale: 0.5,
  },
} as const satisfies Record<'low' | 'medium' | 'high', QualitySettings>;

export type QualityLevel = keyof typeof QUALITY_LEVELS;
