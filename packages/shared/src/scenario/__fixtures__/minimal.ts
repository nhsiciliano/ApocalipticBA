import minimal from './scenario.minimal.json';

type Path = (string | number)[];
type Change = readonly [path: Path, value: unknown];

/** Copia del escenario mínimo, con cambios puntuales. Un valor `undefined` borra la clave. */
export function withChanges(...changes: Change[]): unknown {
  const draft = structuredClone(minimal) as unknown;
  for (const [path, value] of changes) {
    const parentPath = path.slice(0, -1);
    const last = path.at(-1);
    if (last === undefined) throw new Error('withChanges: empty path');
    let node = draft;
    for (const key of parentPath) node = (node as Record<string | number, unknown>)[key];
    if (value === undefined) {
      Reflect.deleteProperty(node as object, last);
    } else {
      (node as Record<string | number, unknown>)[last] = value;
    }
  }
  return draft;
}

export const minimalScenarioJson: unknown = minimal;
