import { ROUTES } from '../src/navigation/routes.ts';
import { Button } from '../src/ui/Button.tsx';
import { Screen } from '../src/ui/Screen.tsx';

export default function HomeScreen() {
  return (
    <Screen
      title="ApocalipticBA"
      subtitle="Buenos Aires después del meteorito. Prototipo de la Fase 0."
    >
      <Button label="Entrá" variant="primary" href={ROUTES.menu} />
    </Screen>
  );
}
