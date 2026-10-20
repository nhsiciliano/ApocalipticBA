import { QUALITY_LEVELS, type QualityLevel } from '@apocalipticba/shared/constants';
import Constants from 'expo-constants';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { PixelRatio, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { readHermesStats } from '../src/debug/hermes.ts';
import { ROUTES } from '../src/navigation/routes.ts';
import {
  detectBackendCapabilities,
  isRenderBackend,
  resolveRenderBackend,
} from '../src/render/backend.ts';
import { GameCanvas } from '../src/render/GameCanvas.tsx';
import { useSpikeRun } from '../src/spike/measure/runStore.ts';
import { SpikeScene } from '../src/spike/SpikeScene.tsx';
import { disposeModel, loadSpikeModel, type LoadedModel } from '../src/spike/zombies/loadModel.ts';
import { isSpikeModelVariant, type SpikeModelVariant } from '../src/spike/zombies/soldierAssets.ts';
import { isQualityLevel } from '../src/store/createSettingsStore.ts';
import { useSettings } from '../src/store/settings.ts';
import { Button } from '../src/ui/Button.tsx';
import { COLORS, MONO_FONT, SPACING } from '../src/ui/theme.ts';

const ZOMBIE_COUNTS = [0, 10, 30] as const;
const QUALITY_ORDER: QualityLevel[] = ['low', 'medium', 'high'];
/** Segundos de calentamiento antes de una corrida automática (compilación de shaders, carga). */
const WARMUP_MS = 3000;
const DEFAULT_RUN_SECONDS = 10;
const REMOUNT_INTERVAL_MS = 1500;

// `type` y no `interface`: expo-router exige asignabilidad a `Record<string, ...>`.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- ver arriba
type SpikeParams = {
  zombies?: string;
  quality?: string;
  backend?: string;
  /** Segundos de medición automática al terminar de cargar. */
  run?: string;
  /** Cantidad de ciclos montar/desmontar del canvas (prueba de leak del renderer). */
  remount?: string;
  model?: string;
};

function parseCount(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/**
 * Pantalla del spike de render (Hito 7). Por deep link:
 * `apocalipticba://spike?zombies=30&quality=high&backend=webgpu&run=10&model=soldier`.
 * Las corridas se vuelcan por consola como JSON (`[spike-sample] {...}`).
 */
export default function SpikeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const params = useLocalSearchParams<SpikeParams>();
  const variant: SpikeModelVariant = isSpikeModelVariant(params.model) ? params.model : 'soldier';
  const runSeconds = parseCount(params.run, 0);
  const remountCycles = parseCount(params.remount, 0);

  const preferredBackend = useSettings((s) => s.renderBackend);
  const quality = useSettings((s) => s.quality);
  const backend = useMemo(
    () => resolveRenderBackend(preferredBackend, detectBackendCapabilities()),
    [preferredBackend],
  );
  const settings = QUALITY_LEVELS[quality];

  const [zombies, setZombies] = useState(() => parseCount(params.zombies, 30));
  const [loaded, setLoaded] = useState<LoadedModel | null>(null);
  // El modelo "vigente" es el de la variante pedida; al cambiarla se ve `null` hasta que cargue.
  const model = loaded?.variant === variant ? loaded : null;
  const [error, setError] = useState<string | null>(null);
  const [canvasKey, setCanvasKey] = useState(0);
  const [mounted, setMounted] = useState(true);
  const [remountsLeft, setRemountsLeft] = useState(0);

  const runStatus = useSpikeRun((s) => s.status);
  const summary = useSpikeRun((s) => s.summary);

  // Overrides por deep link: se persisten como si se hubieran elegido en Ajustes.
  const { backend: backendParam, quality: qualityParam } = params;
  useEffect(() => {
    if (isRenderBackend(backendParam)) useSettings.getState().setRenderBackend(backendParam);
    if (isQualityLevel(qualityParam)) useSettings.getState().setQuality(qualityParam);
  }, [backendParam, qualityParam]);

  useEffect(() => {
    let cancelled = false;
    let owned: LoadedModel | null = null;
    loadSpikeModel(variant)
      .then((result) => {
        if (cancelled) disposeModel(result);
        else {
          owned = result;
          setLoaded(result);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      });
    return () => {
      cancelled = true;
      if (owned) disposeModel(owned);
    };
  }, [variant]);

  // Corrida automática: espera el modelo y un calentamiento antes de grabar.
  useEffect(() => {
    if (!model || runSeconds === 0) return;
    const timer = setTimeout(() => useSpikeRun.getState().start(runSeconds * 1000), WARMUP_MS);
    return () => clearTimeout(timer);
  }, [model, runSeconds]);

  useEffect(() => {
    if (runStatus !== 'done' || !summary) return;
    const scale = PixelRatio.get() * (backend === 'webgpu' ? settings.renderScale : 1);
    const sample = {
      kind: 'spike-sample',
      at: new Date().toISOString(),
      device: Constants.deviceName ?? null,
      os: `${Platform.OS} ${String(Platform.Version)}`,
      dev: __DEV__,
      backend,
      quality,
      renderScale: settings.renderScale,
      sobel: settings.outlines === 'hull+sobel',
      zombies,
      animatedZombies: Math.min(zombies, settings.maxAnimatedZombies),
      model: model?.variant ?? null,
      extensionsUsed: model?.extensionsUsed ?? [],
      loadTimeMs: model?.loadTimeMs ?? null,
      canvas: {
        width: Math.round(window.width * scale),
        height: Math.round(window.height * scale),
      },
      worker: typeof Worker,
      hermes: readHermesStats(),
      ...summary,
    };
    console.log(`[spike-sample] ${JSON.stringify(sample)}`);
  }, [runStatus, summary, backend, quality, settings, zombies, model, window]);

  // Prueba de leak: desmonta y vuelve a montar el canvas N veces, logueando el heap de Hermes.
  useEffect(() => {
    if (remountCycles === 0 || !model) return;
    const timer = setTimeout(() => setRemountsLeft(remountCycles * 2), WARMUP_MS);
    return () => clearTimeout(timer);
  }, [remountCycles, model]);

  useEffect(() => {
    if (remountsLeft === 0) return;
    const timer = setTimeout(() => {
      setMounted((value) => !value);
      setCanvasKey((value) => value + 1);
      setRemountsLeft((value) => value - 1);
      if (remountsLeft % 2 === 0) {
        const iteration = remountCycles - remountsLeft / 2 + 1;
        console.log(
          `[spike-remount] ${JSON.stringify({ iteration, of: remountCycles, hermes: readHermesStats() })}`,
        );
      }
    }, REMOUNT_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [remountsLeft, remountCycles]);

  const cycleQuality = () => {
    const next = QUALITY_ORDER[(QUALITY_ORDER.indexOf(quality) + 1) % QUALITY_ORDER.length]!;
    useSettings.getState().setQuality(next);
  };

  const status = error
    ? `error: ${error}`
    : !model
      ? `cargando ${variant}…`
      : runStatus === 'running'
        ? 'midiendo…'
        : summary
          ? `${summary.fpsAvg} fps · p1 ${summary.fpsP1} fps · p99 ${summary.frameTimeP99Ms} ms`
          : `${variant} en ${model.loadTimeMs} ms · ${zombies} zombies (${Math.min(zombies, settings.maxAnimatedZombies)} animados)`;

  return (
    <View style={styles.root}>
      {mounted ? (
        <GameCanvas key={canvasKey} renderScale={settings.renderScale}>
          <SpikeScene model={model?.gltf ?? null} zombies={zombies} quality={quality} />
        </GameCanvas>
      ) : null}
      <View
        style={[styles.hud, { top: insets.top + SPACING.sm, right: insets.right + SPACING.sm }]}
      >
        {ZOMBIE_COUNTS.map((count) => (
          <Button
            key={count}
            label={String(count)}
            variant={count === zombies ? 'primary' : 'ghost'}
            onPress={() => setZombies(count)}
            style={count === zombies ? styles.hudSelected : styles.hudButton}
          />
        ))}
        <Button label={`Calidad ${quality}`} onPress={cycleQuality} style={styles.hudButton} />
        <Button
          label={`Medir ${DEFAULT_RUN_SECONDS} s`}
          disabled={!model || runStatus === 'running'}
          onPress={() => useSpikeRun.getState().start(DEFAULT_RUN_SECONDS * 1000)}
          style={styles.hudButton}
        />
        <Button
          label="Remontar ×10"
          disabled={!model || remountsLeft > 0}
          onPress={() => setRemountsLeft(20)}
          style={styles.hudButton}
        />
        <Button
          label="Salir"
          onPress={() => router.replace(ROUTES.menu)}
          style={styles.hudButton}
        />
      </View>
      <View
        pointerEvents="none"
        style={[
          styles.status,
          { bottom: insets.bottom + SPACING.sm, left: insets.left + SPACING.sm },
        ]}
      >
        <Text style={styles.statusText}>{status}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  hud: { position: 'absolute', flexDirection: 'row', gap: SPACING.xs },
  hudButton: {
    minWidth: 0,
    paddingHorizontal: SPACING.md,
    backgroundColor: 'rgba(11, 11, 13, 0.6)',
  },
  hudSelected: { minWidth: 0, paddingHorizontal: SPACING.md },
  status: {
    position: 'absolute',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 4,
    backgroundColor: 'rgba(11, 11, 13, 0.7)',
  },
  statusText: { color: COLORS.text, fontFamily: MONO_FONT, fontSize: 11 },
});
