/** Fuente de azar inyectable: el core nunca usa `Math.random()`. */
export interface Rng {
  /** Número en [0, 1). */
  next(): number;
}

/**
 * Generador mulberry32 (Tommy Ettinger): estado de 32 bits, período 2^32, rápido y suficiente para
 * gameplay (no criptográfico). La misma `seed` produce siempre la misma secuencia.
 */
export function createSeededRng(seed: number): Rng {
  let state = seed >>> 0;
  return {
    next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}
