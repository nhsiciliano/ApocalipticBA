export interface FixedStepLoopOptions {
  /** Duración de un paso de simulación, en ms. Default 1000/60. */
  stepMs?: number;
  /** Máximo de pasos por `advance`. Lo que exceda `maxSubSteps * stepMs` se descarta. Default 5. */
  maxSubSteps?: number;
  /** Un paso de simulación. `stepIndex` cuenta desde 0 y se reinicia con `reset()`. */
  onStep: (dtSeconds: number, stepIndex: number) => void;
  /** Se llama una vez por `advance`, después de los pasos, con `alpha` en [0, 1) para interpolar. */
  onRender?: (alpha: number) => void;
}

export interface FixedStepLoop {
  /** Avanza el reloj con el tiempo real del frame (ms). El host lo llama desde su rAF. */
  advance(frameDeltaMs: number): void;
  reset(): void;
  readonly accumulatorMs: number;
  /** Tiempo descartado (ms, acumulado) por frames más largos que `maxSubSteps * stepMs`. */
  readonly droppedMs: number;
  readonly stepMs: number;
}

/**
 * Loop de timestep fijo con acumulador ("Fix Your Timestep"). No lee relojes: el tiempo entra por
 * `advance`, así que es determinista bajo test. Un frame largo (app en background, GC) no dispara
 * una ráfaga de pasos: se procesan como mucho `maxSubSteps` y el resto se cuenta en `droppedMs`.
 */
export function createFixedStepLoop(options: FixedStepLoopOptions): FixedStepLoop {
  const stepMs = options.stepMs ?? 1000 / 60;
  const maxSubSteps = options.maxSubSteps ?? 5;
  if (!(stepMs > 0) || !Number.isFinite(stepMs)) {
    throw new RangeError(`stepMs must be a positive finite number, got ${String(stepMs)}`);
  }
  if (!Number.isInteger(maxSubSteps) || maxSubSteps < 1) {
    throw new RangeError(`maxSubSteps must be an integer >= 1, got ${String(maxSubSteps)}`);
  }

  const dtSeconds = stepMs / 1000;
  // Restar 1000/60 en coma flotante deja restos como 16.666666666666664: sin tolerancia, un frame
  // de exactamente N pasos daría N - 1.
  const readyMs = stepMs - 1e-9;
  const maxFrameMs = stepMs * maxSubSteps;
  let accumulatorMs = 0;
  let droppedMs = 0;
  let stepIndex = 0;

  return {
    advance(frameDeltaMs) {
      if (!(frameDeltaMs > 0) || !Number.isFinite(frameDeltaMs)) return;
      let frameMs = frameDeltaMs;
      if (frameMs > maxFrameMs) {
        droppedMs += frameMs - maxFrameMs;
        frameMs = maxFrameMs;
      }
      accumulatorMs += frameMs;

      let subSteps = 0;
      while (accumulatorMs >= readyMs && subSteps < maxSubSteps) {
        options.onStep(dtSeconds, stepIndex);
        stepIndex += 1;
        subSteps += 1;
        accumulatorMs = Math.max(0, accumulatorMs - stepMs);
      }
      // Gracias al clamp, acá siempre queda un resto menor a un paso.

      options.onRender?.(accumulatorMs / stepMs);
    },
    reset() {
      accumulatorMs = 0;
      droppedMs = 0;
      stepIndex = 0;
    },
    get accumulatorMs() {
      return accumulatorMs;
    },
    get droppedMs() {
      return droppedMs;
    },
    stepMs,
  };
}
