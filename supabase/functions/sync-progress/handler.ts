import { SyncProgressRequestSchema } from '@apocalipticba/shared';

import { createStubHandler } from '../_shared/stub.ts';

/** Stub de Fase 0: valida con `SyncProgressRequestSchema` y responde 501 (se implementa en la Fase 2). */
export const handleSyncProgress = createStubHandler(SyncProgressRequestSchema);
