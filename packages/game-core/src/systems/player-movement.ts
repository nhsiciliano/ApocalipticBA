import { updateClimb } from './climb.ts';
import type { PlayerIntent } from '../adapters/input.ts';
import type { GameContext } from '../game/context.ts';
import { add, isFiniteVec3, scale, ZERO, type Vec3 } from '../math/vec3.ts';

const MAX_PITCH = (89 * Math.PI) / 180;

export interface MoveResult {
  position: Vec3;
  grounded: boolean;
  hitCeiling?: boolean;
}

function clampAxis(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(-1, value)) : 0;
}

function wrapAngle(angle: number): number {
  const wrapped = angle % (2 * Math.PI);
  if (wrapped > Math.PI) return wrapped - 2 * Math.PI;
  if (wrapped <= -Math.PI) return wrapped + 2 * Math.PI;
  return wrapped;
}

/**
 * Intención → velocidad → `desiredDelta`. El core no resuelve colisiones: el host mueve la cápsula
 * con `desiredDelta` contra el BVH y devuelve el resultado con `commitMove`. Mientras el host no
 * haya llamado nunca a `commitMove` (tests, herramientas), el delta se aplica directo y el piso es
 * la Y del spawn del jugador.
 *
 * Convenciones: `yaw = 0` mira a -Z y crece girando a la izquierda (como `rotation.y` de Three.js
 * con orden `YXZ`); `pitch` positivo mira hacia arriba.
 */
export function playerMovementSystem(ctx: GameContext, intent: PlayerIntent, dt: number): void {
  const { player, run, settings } = ctx;
  const { transform, body } = player;
  player.intent = intent;

  if (run.phase === 'climbing') {
    updateClimb(ctx, dt);
    return;
  }
  if (run.phase === 'dead' || run.phase === 'finished') {
    player.velocity.value = ZERO;
    body.desiredDelta = ZERO;
    return;
  }

  // En `reading_note` se ignora el input pero la gravedad sigue integrando.
  const controllable = run.phase === 'playing';

  if (controllable) {
    const look = settings.lookSensitivity;
    const lookX = Number.isFinite(intent.lookDeltaX) ? intent.lookDeltaX : 0;
    const lookY = Number.isFinite(intent.lookDeltaY) ? intent.lookDeltaY : 0;
    const pitchSign = settings.invertY ? -1 : 1;
    transform.yaw = wrapAngle(transform.yaw - lookX * look);
    transform.pitch = Math.min(
      MAX_PITCH,
      Math.max(-MAX_PITCH, transform.pitch + lookY * look * pitchSign),
    );
    body.crouching = intent.crouch;
  }

  let moveX = controllable ? clampAxis(intent.moveX) : 0;
  let moveY = controllable ? clampAxis(intent.moveY) : 0;
  const magnitude = Math.hypot(moveX, moveY);
  if (magnitude > 1) {
    moveX /= magnitude;
    moveY /= magnitude;
  }

  // Correr se cancela al agacharse.
  const speed = body.crouching
    ? settings.crouchSpeed
    : intent.run
      ? settings.runSpeed
      : settings.walkSpeed;
  const sin = Math.sin(transform.yaw);
  const cos = Math.cos(transform.yaw);
  // forward = (-sin, 0, -cos); right = (cos, 0, -sin)
  const vx = (cos * moveX - sin * moveY) * speed;
  const vz = (-sin * moveX - cos * moveY) * speed;

  let vy = player.velocity.value[1];
  if (controllable && intent.jump && body.grounded) {
    vy = settings.jumpSpeed;
    body.grounded = false;
  } else {
    vy += settings.gravity * dt;
  }

  player.velocity.value = [vx, vy, vz];
  body.desiredDelta = scale(player.velocity.value, dt);

  if (!run.hostResolvesCollisions) applyWithoutCollision(ctx, body.desiredDelta);
}

/** Modo sin colisión: aplica el delta y apoya al jugador en `groundY`. */
function applyWithoutCollision(ctx: GameContext, delta: Vec3): void {
  const { player, run } = ctx;
  const next = add(player.transform.position, delta);
  if (next[1] <= run.groundY) {
    player.transform.position = [next[0], run.groundY, next[2]];
    player.body.grounded = true;
    const velocity = player.velocity.value;
    if (velocity[1] < 0) player.velocity.value = [velocity[0], 0, velocity[2]];
  } else {
    player.transform.position = next;
    player.body.grounded = false;
  }
}

/** Resultado del movimiento resuelto por el host. Se ignora durante `climbing`, `dead` y `finished`. */
export function commitMove(ctx: GameContext, result: MoveResult): void {
  const { player, run } = ctx;
  if (run.phase === 'climbing' || run.phase === 'dead' || run.phase === 'finished') return;
  if (!isFiniteVec3(result.position)) {
    ctx.warn('commitMove ignored: position is not a finite Vec3');
    return;
  }
  run.hostResolvesCollisions = true;
  player.transform.position = [result.position[0], result.position[1], result.position[2]];
  player.body.grounded = result.grounded;
  const [vx, vy, vz] = player.velocity.value;
  if ((result.grounded && vy < 0) || (result.hitCeiling === true && vy > 0)) {
    player.velocity.value = [vx, 0, vz];
  }
}

export function teleport(ctx: GameContext, position: Vec3, yaw?: number): void {
  const { player, run } = ctx;
  if (!isFiniteVec3(position)) {
    ctx.warn('teleport ignored: position is not a finite Vec3');
    return;
  }
  player.transform.position = [position[0], position[1], position[2]];
  if (yaw !== undefined) player.transform.yaw = wrapAngle(yaw);
  player.velocity.value = ZERO;
  player.body.desiredDelta = ZERO;
  player.body.grounded = run.hostResolvesCollisions ? false : position[1] <= run.groundY;
  run.placed = true;
}
