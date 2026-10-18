import type { LocalizedText } from '@apocalipticba/shared';

import type { Locale } from '../game/settings';

/** Texto en el locale pedido; si falta en inglés, cae a es-AR (que siempre existe). */
export function resolveText(text: LocalizedText, locale: Locale): string {
  return locale === 'en' ? (text.en ?? text['es-AR']) : text['es-AR'];
}
