import { Button } from '../src/ui/Button.tsx';
import { Screen } from '../src/ui/Screen.tsx';

export default function LoginScreen() {
  return (
    <Screen
      title="Iniciar sesión"
      subtitle="El login con Supabase llega más adelante. Mientras tanto, seguí como invitado."
      back
    >
      <Button label="Continuar con Apple" disabled />
      <Button label="Continuar con Google" disabled />
    </Screen>
  );
}
