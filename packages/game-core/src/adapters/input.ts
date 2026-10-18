/** Intención del jugador para un paso de simulación. El host la arma desde el input táctil. */
export interface PlayerIntent {
  /** Strafe: -1 (izquierda) a 1 (derecha). */
  moveX: number;
  /** Avance: -1 (atrás) a 1 (adelante). */
  moveY: number;
  /** Giro horizontal en radianes desde el paso anterior; positivo = mirar a la derecha. */
  lookDeltaX: number;
  /** Giro vertical en radianes desde el paso anterior; positivo = mirar hacia arriba. */
  lookDeltaY: number;
  jump: boolean;
  crouch: boolean;
  run: boolean;
  /** Se pulsó interactuar en este paso (flanco, no estado). */
  interact: boolean;
  /** Interactuar está mantenido (para interacciones sostenidas). */
  interactHeld: boolean;
  /** Se pulsó la linterna en este paso (flanco). */
  flashlightToggle: boolean;
}

export interface InputAdapter {
  /** Lo llama el core una vez por paso. Los flancos (`interact`, `jump`...) se consumen al leerlos. */
  sample(): PlayerIntent;
}

export function createNeutralIntent(): PlayerIntent {
  return {
    moveX: 0,
    moveY: 0,
    lookDeltaX: 0,
    lookDeltaY: 0,
    jump: false,
    crouch: false,
    run: false,
    interact: false,
    interactHeld: false,
    flashlightToggle: false,
  };
}
