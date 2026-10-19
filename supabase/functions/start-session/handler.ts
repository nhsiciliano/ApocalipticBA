import { StartSessionRequestSchema } from '@apocalipticba/shared';

import { createStubHandler } from '../_shared/stub.ts';

/** Stub de Fase 0: valida con `StartSessionRequestSchema` y responde 501 (se implementa en la Fase 2). */
export const handleStartSession = createStubHandler(StartSessionRequestSchema);
