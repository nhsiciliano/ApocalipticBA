import { METEORITE_PALETTE } from '@apocalipticba/shared/constants';
import { Platform } from 'react-native';

/** Paleta de la UI placeholder: gris frío apagado y el rojo del meteorito como único acento. */
export const COLORS = {
  background: '#0B0B0D',
  surface: '#17171B',
  border: '#2A2A31',
  text: '#EDEDED',
  muted: '#9A9AA3',
  accent: METEORITE_PALETTE.core,
  accentGlow: METEORITE_PALETTE.glow,
  danger: METEORITE_PALETTE.blood,
} as const;

export const MONO_FONT = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export const SPACING = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
