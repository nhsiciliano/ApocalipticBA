import { useRouter } from 'expo-router';

import { ROUTES } from '../src/navigation/routes.ts';
import { Button } from '../src/ui/Button.tsx';
import { Screen } from '../src/ui/Screen.tsx';

export default function GameOverScreen() {
  const router = useRouter();
  return (
    <Screen
      title="Moriste"
      subtitle="Buenos Aires no perdona. Volvé a intentarlo desde el último checkpoint."
    >
      <Button label="Reintentar" variant="primary" onPress={() => router.replace(ROUTES.play)} />
      <Button label="Menú" onPress={() => router.dismissTo(ROUTES.menu)} />
    </Screen>
  );
}
