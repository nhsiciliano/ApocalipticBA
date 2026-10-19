import { ROUTES } from '../src/navigation/routes.ts';
import { Button } from '../src/ui/Button.tsx';
import { Screen } from '../src/ui/Screen.tsx';

export default function ProfileScreen() {
  return (
    <Screen
      title="Perfil"
      subtitle="Jugás como invitado. Iniciá sesión para guardar tu progreso en la nube."
      back
    >
      <Button label="Iniciar sesión" href={ROUTES.login} />
    </Screen>
  );
}
