import { createMMKV } from 'react-native-mmkv';

import { createSettingsStore } from './createSettingsStore.ts';
import { createKeyValueStateStorage } from './storage.ts';

/** Instancia MMKV propia de los ajustes (separada de progreso y sesión, que llegan en Hito 9). */
export const settingsStorage = createMMKV({ id: 'settings' });

export const useSettings = createSettingsStore(createKeyValueStateStorage(settingsStorage));
