import { useRouter } from 'expo-router';

import { ROUTES } from '../src/navigation/routes.ts';
import { Button } from '../src/ui/Button.tsx';
import { Screen } from '../src/ui/Screen.tsx';

export default function PauseScreen() {
  const router = useRouter();
  return (
    <Screen title="Pausa" subtitle="La partida queda esperándote.">
      <Button label="Continuar" variant="primary" onPress={() => router.back()} />
      <Button label="Ajustes" href={ROUTES.settings} />
      <Button label="Salir al menú" onPress={() => router.dismissTo(ROUTES.menu)} />
    </Screen>
  );
}
