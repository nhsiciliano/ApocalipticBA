import type { Pickup, PickupItem } from '@apocalipticba/shared';

import type { GameContext } from '../game/context';

/** Items que se tienen o no (cantidad 1); el resto se acumula. */
const UNIQUE_ITEMS: ReadonlySet<PickupItem> = new Set(['pistola', 'escopeta', 'linterna']);

export function hasItem(ctx: GameContext, item: PickupItem): boolean {
  return (ctx.run.inventory.get(item) ?? 0) > 0;
}

/**
 * Recoge un pickup: suma al inventario, emite eventos y lo marca consumido (persiste en el
 * checkpoint). Devuelve `false` si ya estaba consumido.
 */
export function collectPickup(ctx: GameContext, pickup: Pickup): boolean {
  if (ctx.run.consumedPickups.has(pickup.id)) return false;
  ctx.run.consumedPickups.add(pickup.id);

  const previous = ctx.run.inventory.get(pickup.item) ?? 0;
  const total = UNIQUE_ITEMS.has(pickup.item) ? 1 : previous + pickup.amount;
  ctx.run.inventory.set(pickup.item, total);

  ctx.events.emit('pickup.collected', {
    pickupId: pickup.id,
    item: pickup.item,
    amount: pickup.amount,
  });
  if (total !== previous)
    ctx.events.emit('inventory.changed', { item: pickup.item, amount: total });
  ctx.haptics?.impact('light');
  return true;
}
