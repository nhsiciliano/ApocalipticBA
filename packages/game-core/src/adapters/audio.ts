import type { AudioCueId } from '@apocalipticba/shared';

export interface AudioPlayOptions {
  loop?: boolean;
}

export interface AudioAdapter {
  play(cueId: AudioCueId, options?: AudioPlayOptions): void;
  stop(cueId: AudioCueId): void;
  setAmbient(cueId: AudioCueId | null): void;
}
