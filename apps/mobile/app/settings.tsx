import { QUALITY_LEVELS, type QualityLevel } from '@apocalipticba/shared/constants';

import { RENDER_BACKENDS, RENDER_BACKEND_LABELS } from '../src/render/backend.ts';
import { useSettings } from '../src/store/settings.ts';
import { Button } from '../src/ui/Button.tsx';
import { Screen } from '../src/ui/Screen.tsx';
import { Segmented } from '../src/ui/Segmented.tsx';

const BACKEND_OPTIONS = RENDER_BACKENDS.map((value) => ({
  value,
  label: RENDER_BACKEND_LABELS[value],
}));

const QUALITY_LABELS: Record<QualityLevel, string> = { low: 'Baja', medium: 'Media', high: 'Alta' };
const QUALITY_OPTIONS = (Object.keys(QUALITY_LEVELS) as QualityLevel[]).map((value) => ({
  value,
  label: QUALITY_LABELS[value],
}));

const OVERLAY_OPTIONS = [
  { value: 'on', label: 'Visible' },
  { value: 'off', label: 'Oculto' },
] as const;

export default function SettingsScreen() {
  const renderBackend = useSettings((s) => s.renderBackend);
  const quality = useSettings((s) => s.quality);
  const debugOverlay = useSettings((s) => s.debugOverlay);
  const { setRenderBackend, setQuality, setDebugOverlay, reset } = useSettings.getState();

  return (
    <Screen
      title="Ajustes"
      subtitle="Se guardan en el dispositivo. El backend se aplica al volver a entrar a la partida."
      back
    >
      <Segmented
        label="Backend de render"
        options={BACKEND_OPTIONS}
        value={renderBackend}
        onChange={setRenderBackend}
      />
      <Segmented label="Calidad" options={QUALITY_OPTIONS} value={quality} onChange={setQuality} />
      <Segmented
        label="Overlay de debug"
        options={OVERLAY_OPTIONS}
        value={debugOverlay ? 'on' : 'off'}
        onChange={(value) => setDebugOverlay(value === 'on')}
      />
      <Button label="Restablecer" onPress={reset} />
    </Screen>
  );
}
