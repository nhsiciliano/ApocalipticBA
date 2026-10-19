import { describe, expect, it } from 'vitest';

import { ID_PATTERNS } from './ids.ts';

describe('ID_PATTERNS', () => {
  it.each([
    ['trigger', ['TRG_esquina_4a', 'TRG_x'], ['TRG_', 'trg_x', 'TRG_Mayus']],
    ['checkpoint', ['CHK_4a', 'CHK_4c'], ['CHK_4_a', 'CHK_', 'chk_4a']],
    ['encounter', ['enc_4a', 'enc_4b_1'], ['enc_', 'ENC_4a', 'enc-4a']],
    [
      'spawn',
      ['SPAWN_enc_4a_1', 'SPAWN_enc_4b_1_2', 'SPAWN_player_start_1'],
      ['SPAWN_enc_4a', 'SPAWN_player_start', 'SPAWN_otro_1'],
    ],
    ['playerSpawn', ['SPAWN_player_start_1'], ['SPAWN_enc_4a_1', 'SPAWN_player_start']],
    [
      'pickup',
      ['PICK_pistola_1', 'PICK_botiquin_12', 'PICK_municion_pistola_1'],
      ['PICK_pistola', 'PICK__1', 'PICK_Pistola_1', 'PICK_municion__pistola_1'],
    ],
    [
      'marker',
      ['MRK_sacristia', 'MRK_iglesia_portal_2'],
      ['MRK_', 'mrk_x', 'MRK_Mayus', 'sacristia'],
    ],
    [
      'interactable',
      ['INT_note_carta_1', 'INT_hold_sacristia', 'INT_gate_salida_hall'],
      ['INT_door_x', 'INT_note_', 'INT_note'],
    ],
    ['oneway', ['COL_oneway_andamio'], ['COL_andamio', 'COL_oneway_']],
    ['note', ['note_carta_1'], ['note_', 'Note_carta']],
    ['objective', ['obj_leer_carta'], ['obj_', 'objetivo_x']],
    [
      'audioCue',
      ['sfx_grito', 'vo_carta_1', 'amb_viento', 'mus_menu'],
      ['sfx_', 'fx_grito', 'vo-carta'],
    ],
    ['scenarioSlug', ['constitucion', 'linea-c'], ['Linea C', 'línea', '']],
    ['hexColor', ['#FF3B1F', '#a0b1c2'], ['FF3B1F', '#FFF', '#GG0000']],
  ] as const)('%s accepts valid ids and rejects invalid ones', (name, valid, invalid) => {
    const pattern = ID_PATTERNS[name];
    for (const id of valid) expect(pattern.test(id), id).toBe(true);
    for (const id of invalid) expect(pattern.test(id), id).toBe(false);
  });
});
