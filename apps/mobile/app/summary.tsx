import { useRouter } from 'expo-router';

import { ROUTES } from '../src/navigation/routes.ts';
import { Button } from '../src/ui/Button.tsx';
import { Screen } from '../src/ui/Screen.tsx';

export default function SummaryScreen() {
  const router = useRouter();
  return (
    <Screen
      title="Resumen"
      subtitle="Acá va a ir tu puntaje, el tiempo y lo que encontraste en la corrida."
    >
      <Button label="Ver ranking" variant="primary" href={ROUTES.ranking} />
      <Button label="Diario" href={ROUTES.journal} />
      <Button label="Menú" onPress={() => router.dismissTo(ROUTES.menu)} />
    </Screen>
  );
}
