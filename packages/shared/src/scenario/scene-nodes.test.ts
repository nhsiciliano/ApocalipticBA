import { describe, expect, it } from 'vitest';

import { minimalScenarioJson } from './__fixtures__/minimal';
import { collectSceneNodeIds } from './scene-nodes';
import { parseScenario } from './schema';

describe('collectSceneNodeIds', () => {
  const byZone = collectSceneNodeIds(parseScenario(minimalScenarioJson));
  const sorted = (zone: keyof typeof byZone): string[] => [...byZone[zone]].sort();

  it('groups every node id by the zone whose glTF must contain it', () => {
    expect(sorted('Z1_Hall')).toEqual([
      'INT_gate_salida_hall',
      'INT_note_carta_1',
      'PICK_escopeta_1',
      'PICK_pistola_1',
      'SPAWN_player_start_1',
    ]);
    expect(sorted('Z3_Frente')).toEqual(['INT_locked_reja']);
    expect(sorted('Z4_Lateral')).toEqual([
      'CHK_4a',
      'CHK_4c',
      'COL_oneway_andamio',
      'INT_climb_andamio',
      'INT_hold_sacristia',
      'MRK_sacristia',
      'SPAWN_enc_4a_1',
      'SPAWN_enc_4a_2',
      'SPAWN_enc_4a_3',
      'TRG_esquina_4a',
    ]);
  });

  it('returns an empty set for zones without entities', () => {
    expect(Object.keys(byZone)).toHaveLength(6);
    expect(byZone.Z2_Plaza.size).toBe(0);
    expect(byZone.Z5_Interior.size).toBe(0);
    expect(byZone.BG_Skyline.size).toBe(0);
  });

  it('does not list notes: they have no scene node', () => {
    const all = Object.values(byZone).flatMap((ids) => [...ids]);
    expect(all.some((id) => id.startsWith('note_'))).toBe(false);
  });
});
