import { ROUTES } from '../src/navigation/routes.ts';
import { Button } from '../src/ui/Button.tsx';
import { Screen } from '../src/ui/Screen.tsx';

export default function ScenariosScreen() {
  return (
    <Screen
      title="Escenarios"
      subtitle="Por ahora hay uno solo: el escenario 01 del prototipo."
      back
    >
      <Button label="Escenario 01" variant="primary" href={ROUTES.play} />
    </Screen>
  );
}
