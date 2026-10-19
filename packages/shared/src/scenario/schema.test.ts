import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';

import { minimalScenarioJson, withChanges } from './__fixtures__/minimal.ts';
import { parseScenario, safeParseScenario } from './schema.ts';

function issuePaths(input: unknown): string[] {
  const result = safeParseScenario(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
}

describe('scenario fixture', () => {
  it('parses and applies defaults', () => {
    const scenario = parseScenario(minimalScenarioJson);
    expect(scenario.id).toBe('constitucion');
    expect(scenario.zones.map((zone) => zone.id)).toEqual([
      'Z1_Hall',
      'Z2_Plaza',
      'Z3_Frente',
      'Z4_Lateral',
      'Z5_Interior',
      'BG_Skyline',
    ]);
    expect(scenario.interactables).toHaveLength(5);
  });

  it('keeps the two letters from the design document', () => {
    const { notes } = parseScenario(minimalScenarioJson);
    const [first, second] = notes;
    expect(first?.body['es-AR']).toMatch(/^Te golpeaste fuerte la cabeza.*Te quiero\. Papá\.$/);
    expect(second?.body['es-AR']).toMatch(
      /^Hijo: las cosas se complicaron.*mantenerte a salvo\. Papá\.$/,
    );
  });

  it('fills defaults for omitted optional fields', () => {
    const scenario = parseScenario(
      withChanges(
        [['triggers', 0, 'once'], undefined],
        [['encounters', 0, 'onEnd'], undefined],
        [['encounters', 0, 'waves', 0, 'delayMs'], undefined],
        [['pickups', 0, 'amount'], undefined],
        [['interactables', 2, 'accumulative'], undefined],
        [['zones', 0, 'preload'], undefined],
        [['oneways'], undefined],
      ),
    );
    expect(scenario.triggers[0]?.once).toBe(true);
    expect(scenario.encounters[0]?.onEnd).toEqual([]);
    expect(scenario.encounters[0]?.waves[0]?.delayMs).toBe(0);
    expect(scenario.pickups[0]?.amount).toBe(1);
    expect(scenario.zones[0]?.preload).toEqual([]);
    expect(scenario.oneways).toEqual([]);
    const hold = scenario.interactables[2];
    expect(hold?.kind === 'hold' && hold.accumulative).toBe(true);
  });

  it('throws a ZodError from parseScenario on invalid input', () => {
    expect(() => parseScenario({})).toThrow(ZodError);
    expect(safeParseScenario(null).success).toBe(false);
  });
});

describe('field-level rules', () => {
  it.each([
    ['unsupported schemaVersion', [['schemaVersion'], 2], 'schemaVersion'],
    ['unknown key (strict objects)', [['triggers', 0, 'extra'], true], 'triggers.0'],
    ['non-slug scenario id', [['id'], 'Constitución'], 'id'],
    ['zone file without .gltf', [['zones', 0, 'file'], 'z1-hall.glb'], 'zones.0.file'],
    ['bad fog color', [['zones', 0, 'fogColor'], 'red'], 'zones.0.fogColor'],
    ['empty es-AR text', [['objectives', 0, 'text', 'es-AR'], ''], 'objectives.0.text.es-AR'],
    ['bad trigger id', [['triggers', 0, 'id'], 'trigger_esquina'], 'triggers.0.id'],
    ['bad checkpoint id', [['checkpoints', 0, 'id'], 'CHK_4_a'], 'checkpoints.0.id'],
    ['unknown pickup item', [['pickups', 0, 'item'], 'lanzagranadas'], 'pickups.0.item'],
    ['pickup amount 0', [['pickups', 0, 'amount'], 0], 'pickups.0.amount'],
    ['trigger without actions', [['triggers', 0, 'actions'], []], 'triggers.0.actions'],
    [
      'unknown action type',
      [['triggers', 0, 'actions', 0, 'type'], 'boom'],
      'triggers.0.actions.0.type',
    ],
    [
      'text.show duration 0',
      [['triggers', 0, 'actions', 3, 'durationMs'], 0],
      'triggers.0.actions.3.durationMs',
    ],
    [
      'bad audio cue',
      [['triggers', 0, 'actions', 2, 'cueId'], 'grito'],
      'triggers.0.actions.2.cueId',
    ],
    [
      'hold without onComplete',
      [['interactables', 2, 'onComplete'], []],
      'interactables.2.onComplete',
    ],
    ['hold duration 0', [['interactables', 2, 'durationMs'], 0], 'interactables.2.durationMs'],
    ['climb with one point', [['interactables', 3, 'path'], [[0, 0, 0]]], 'interactables.3.path'],
    [
      'climb point not a Vec3',
      [
        ['interactables', 3, 'path', 0],
        [0, 0],
      ],
      'interactables.3.path.0',
    ],
    [
      'gate without items',
      [['interactables', 4, 'requiresItems'], []],
      'interactables.4.requiresItems',
    ],
    ['oneway without unloadZones', [['oneways', 0, 'unloadZones'], []], 'oneways.0.unloadZones'],
    ['no objectives', [['objectives'], []], 'objectives'],
  ] as const)('rejects %s', (_name, [path, value], expectedPath) => {
    expect(issuePaths(withChanges([[...path], value]))).toContain(expectedPath);
  });

  it('rejects an encounter wave without zombies', () => {
    const input = withChanges([
      ['encounters', 0, 'waves', 0, 'composition'],
      { comun: 0, corredor: 0 },
    ]);
    expect(issuePaths(input)).toContain('encounters.0.waves.0.composition');
  });

  it('requires timerMs when endCondition is timer', () => {
    const withoutTimer = withChanges([['encounters', 0, 'endCondition'], 'timer']);
    expect(issuePaths(withoutTimer)).toContain('encounters.0.timerMs');

    const withTimer = withChanges(
      [['encounters', 0, 'endCondition'], 'timer'],
      [['encounters', 0, 'timerMs'], 45_000],
    );
    expect(safeParseScenario(withTimer).success).toBe(true);
  });

  it('requires the INT_ id prefix to match the interactable kind', () => {
    const input = withChanges([['interactables', 1, 'id'], 'INT_hold_reja']);
    expect(issuePaths(input)).toEqual(['interactables.1.id']);
  });
});

describe('pickup and marker naming', () => {
  it('accepts a pickup whose id type is the full item name', () => {
    const input = withChanges(
      [['pickups', 0, 'id'], 'PICK_municion_pistola_1'],
      [['pickups', 0, 'item'], 'municion_pistola'],
    );
    expect(safeParseScenario(input).success).toBe(true);
  });

  it('rejects a pickup whose id type differs from its item', () => {
    expect(issuePaths(withChanges([['pickups', 0, 'item'], 'escopeta']))).toEqual(['pickups.0.id']);
    const partial = withChanges(
      [['pickups', 0, 'id'], 'PICK_municion_1'],
      [['pickups', 0, 'item'], 'municion_pistola'],
    );
    expect(issuePaths(partial)).toEqual(['pickups.0.id']);
  });

  it('requires objective markers to be MRK_<id>', () => {
    expect(issuePaths(withChanges([['objectives', 1, 'markerNode'], 'sacristia']))).toEqual([
      'objectives.1.markerNode',
    ]);
    expect(issuePaths(withChanges([['objectives', 1, 'markerNode'], undefined]))).toEqual([]);
  });
});

describe('cross-reference rules', () => {
  it.each([
    [
      'objective in an action',
      [['interactables', 0, 'onRead', 0, 'objectiveId'], 'obj_nope'],
      'interactables.0.onRead.0.objectiveId',
    ],
    [
      'encounter in an action',
      [['triggers', 0, 'actions', 1, 'encounterId'], 'enc_nope'],
      'triggers.0.actions.1.encounterId',
    ],
    [
      'checkpoint in an action',
      [['interactables', 3, 'onComplete', 0, 'checkpointId'], 'CHK_9z'],
      'interactables.3.onComplete.0.checkpointId',
    ],
    [
      'note in an interactable',
      [['interactables', 0, 'noteId'], 'note_nope'],
      'interactables.0.noteId',
    ],
    [
      'pickup in an interactable',
      [
        ['interactables', 5],
        {
          id: 'INT_pickup_bolso',
          zone: 'Z1_Hall',
          prompt: { 'es-AR': 'Agarrar' },
          kind: 'pickup',
          pickupId: 'PICK_nada_1',
        },
      ],
      'interactables.5.pickupId',
    ],
    [
      'spawn of another encounter',
      [['encounters', 0, 'waves', 0, 'spawnIds', 1], 'SPAWN_enc_4b_1'],
      'encounters.0.waves.0.spawnIds.1',
    ],
    [
      'spawn id with extra segment',
      [['encounters', 0, 'waves', 0, 'spawnIds', 0], 'SPAWN_enc_4a_1_2'],
      'encounters.0.waves.0.spawnIds.0',
    ],
    [
      'start spawn that is not a player spawn',
      [['start', 'spawnId'], 'SPAWN_enc_4a_1'],
      'start.spawnId',
    ],
  ] as const)('rejects a broken reference: %s', (_name, [path, value], expectedPath) => {
    expect(issuePaths(withChanges([[...path], value]))).toEqual([expectedPath]);
  });

  it('rejects references to zones that the scenario does not declare', () => {
    const zones = parseScenario(minimalScenarioJson).zones.filter((zone) => zone.id !== 'Z2_Plaza');
    const paths = issuePaths(withChanges([['zones'], zones]));
    expect(paths).toEqual(
      expect.arrayContaining([
        'zones.0.preload.0',
        'interactables.4.onOpen.0.zones.0',
        'oneways.0.unloadZones.0',
      ]),
    );
  });

  it('rejects unknown zones in zone.unload actions', () => {
    const input = withChanges([
      ['triggers', 0, 'actions', 4],
      { type: 'zone.unload', zones: ['Z1_Hall', 'Z9_Nada'] },
    ]);
    expect(issuePaths(input)).toContain('triggers.0.actions.4.zones.1');
  });

  it('keeps BG_Skyline decorative', () => {
    expect(issuePaths(withChanges([['triggers', 0, 'zone'], 'BG_Skyline']))).toEqual([
      'triggers.0.zone',
    ]);
    expect(issuePaths(withChanges([['start', 'zone'], 'BG_Skyline']))).toEqual(['start.zone']);
    expect(issuePaths(withChanges([['objectives', 0, 'zone'], 'BG_Skyline']))).toEqual([
      'objectives.0.zone',
    ]);
    expect(issuePaths(withChanges([['pickups', 0, 'zone'], 'BG_Skyline']))).toEqual([
      'pickups.0.zone',
    ]);
  });

  it('allows BG_Skyline as its own zone and as a preload/unload target', () => {
    const input = withChanges(
      [['zones', 0, 'preload'], ['BG_Skyline']],
      [
        ['oneways', 0, 'unloadZones'],
        ['Z2_Plaza', 'BG_Skyline'],
      ],
    );
    expect(safeParseScenario(input).success).toBe(true);
  });

  it('rejects duplicate ids inside a collection', () => {
    const duplicate = parseScenario(minimalScenarioJson).triggers[0];
    const input = withChanges([['triggers', 1], duplicate]);
    expect(issuePaths(input)).toEqual(['triggers.1.id']);
  });

  it('rejects duplicate zones', () => {
    const duplicate = parseScenario(minimalScenarioJson).zones[1];
    expect(issuePaths(withChanges([['zones', 6], duplicate]))).toEqual(['zones.6.id']);
  });
});
