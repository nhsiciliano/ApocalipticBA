import type {
  Checkpoint,
  Interactable,
  Oneway,
  Pickup,
  Trigger,
  ZoneId,
} from '@apocalipticba/shared';
import { World, type With } from 'miniplex';

import type { PlayerIntent } from '../adapters/input';
import type { Aabb } from '../math/aabb';
import type { Vec3 } from '../math/vec3';

/**
 * Componentes del ECS. Son internos: nada de esto se exporta desde el paquete. Los vectores son
 * inmutables (`Vec3`): un sistema que mueve algo reemplaza el vector, no lo muta.
 */
export interface Entity {
  /** Nodo del glTF de una zona, registrado por el host con `world.registerZoneNodes`. */
  node?: { id: string; zone: ZoneId; position: Vec3 };
  triggerVolume?: { aabb: Aabb; def: Trigger; inside: boolean; firedWhileInside: boolean };
  onewayVolume?: { aabb: Aabb; def: Oneway };
  pickup?: { radius: number; def: Pickup };
  interactable?: { radius: number; def: Interactable };
  checkpoint?: { yaw: number; def: Checkpoint };
  spawn?: { yaw: number };
  marker?: true;

  player?: true;
  transform?: { position: Vec3; yaw: number; pitch: number };
  velocity?: { value: Vec3 };
  intent?: PlayerIntent;
  health?: { current: number; max: number };
  body?: { grounded: boolean; crouching: boolean; desiredDelta: Vec3 };
}

export type PlayerEntity = With<
  Entity,
  'player' | 'transform' | 'velocity' | 'intent' | 'health' | 'body'
>;

export function createEcs() {
  const world = new World<Entity>();
  return {
    world,
    nodes: world.with('node'),
    triggers: world.with('node', 'triggerVolume'),
    oneways: world.with('node', 'onewayVolume'),
    pickups: world.with('node', 'pickup'),
    interactables: world.with('node', 'interactable'),
    checkpoints: world.with('node', 'checkpoint'),
    spawns: world.with('node', 'spawn'),
  };
}

export type Ecs = ReturnType<typeof createEcs>;
