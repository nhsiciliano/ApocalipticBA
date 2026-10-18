/** Payload de cada evento; `undefined` = evento sin payload. */
export type EventMapBase = object;

type EventArgs<M extends EventMapBase, K extends keyof M> = M[K] extends undefined ? [] : [M[K]];
export type EventHandler<M extends EventMapBase, K extends keyof M> = (
  ...args: EventArgs<M, K>
) => void;

export interface EventBus<M extends EventMapBase> {
  /** Suscribe un handler; devuelve la función para desuscribirlo. */
  on<K extends keyof M>(type: K, handler: EventHandler<M, K>): () => void;
  /** Como `on`, pero se desuscribe solo después del primer evento. */
  once<K extends keyof M>(type: K, handler: EventHandler<M, K>): () => void;
  emit<K extends keyof M>(type: K, ...args: EventArgs<M, K>): void;
  /** Quita todos los handlers (de un tipo o de todos). */
  clear(type?: keyof M): void;
}

/**
 * Bus de eventos tipado y síncrono. Los handlers corren en orden de suscripción, dentro del `step`
 * que emitió el evento; desuscribirse durante un `emit` es seguro.
 */
export function createEventBus<M extends EventMapBase>(): EventBus<M> {
  type AnyHandler = (...args: unknown[]) => void;
  const handlers = new Map<keyof M, Set<AnyHandler>>();

  const on = <K extends keyof M>(type: K, handler: EventHandler<M, K>): (() => void) => {
    const fn = handler as AnyHandler;
    let set = handlers.get(type);
    if (set === undefined) {
      set = new Set();
      handlers.set(type, set);
    }
    set.add(fn);
    return () => {
      handlers.get(type)?.delete(fn);
    };
  };

  return {
    on,
    once(type, handler) {
      const off = on(type, (...args: Parameters<typeof handler>) => {
        off();
        handler(...args);
      });
      return off;
    },
    emit(type, ...args) {
      const set = handlers.get(type);
      if (set === undefined || set.size === 0) return;
      for (const handler of [...set]) handler(...args);
    },
    clear(type) {
      if (type === undefined) handlers.clear();
      else handlers.delete(type);
    },
  };
}
