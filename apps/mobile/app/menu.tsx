import { ROUTES } from '../src/navigation/routes.ts';
import { Button } from '../src/ui/Button.tsx';
import { Screen } from '../src/ui/Screen.tsx';

export default function MenuScreen() {
  return (
    <Screen title="Menú" subtitle="Elegí qué querés hacer.">
      <Button label="Jugar" variant="primary" href={ROUTES.scenarios} />
      <Button label="Diario" href={ROUTES.journal} />
      <Button label="Ranking" href={ROUTES.ranking} />
      <Button label="Perfil" href={ROUTES.profile} />
      <Button label="Ajustes" href={ROUTES.settings} />
      <Button label="Iniciar sesión" href={ROUTES.login} />
    </Screen>
  );
}
