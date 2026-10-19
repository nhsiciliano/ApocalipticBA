import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ROUTES } from '../src/navigation/routes.ts';
import { isRenderBackend } from '../src/render/backend.ts';
import { GameCanvas } from '../src/render/GameCanvas.tsx';
import { MeteoriteCube } from '../src/render/scenes/MeteoriteCube.tsx';
import { useSettings } from '../src/store/settings.ts';
import { Button } from '../src/ui/Button.tsx';
import { SPACING } from '../src/ui/theme.ts';

export default function PlayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Override para pruebas por deep link (`apocalipticba://play?backend=webgl`): se persiste
  // como si se hubiera elegido en Ajustes.
  const { backend } = useLocalSearchParams<{ backend?: string }>();

  useEffect(() => {
    if (isRenderBackend(backend)) useSettings.getState().setRenderBackend(backend);
  }, [backend]);

  return (
    <View style={styles.root}>
      <GameCanvas>
        <MeteoriteCube />
      </GameCanvas>
      <View
        style={[styles.hud, { top: insets.top + SPACING.sm, right: insets.right + SPACING.sm }]}
      >
        <Button label="Pausa" onPress={() => router.push(ROUTES.pause)} style={styles.hudButton} />
        <Button
          label="Morir"
          onPress={() => router.replace(ROUTES.gameOver)}
          style={styles.hudButton}
        />
        <Button
          label="Terminar"
          onPress={() => router.replace(ROUTES.summary)}
          style={styles.hudButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hud: { position: 'absolute', flexDirection: 'row', gap: SPACING.xs },
  hudButton: {
    minWidth: 0,
    paddingHorizontal: SPACING.md,
    backgroundColor: 'rgba(11, 11, 13, 0.6)',
  },
});
