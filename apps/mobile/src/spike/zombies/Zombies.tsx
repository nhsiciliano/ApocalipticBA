import { QUALITY_LEVELS, type QualityLevel } from '@apocalipticba/shared/constants';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import {
  AnimationClip,
  AnimationMixer,
  Group,
  type Material,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
  type SkinnedMesh,
  type Texture,
} from 'three/webgpu';

import {
  OUTLINE_HULL_THICKNESS,
  createOutlineHull,
  createOutlineHullMaterial,
  isSkinnedMesh,
} from '../materials/outline-hull.ts';
import { createToonMaterial, disposeToonMaterial } from '../materials/toon.tsl.ts';

/** Clips del Soldier repartidos entre instancias para que no vayan en fase. */
const CLIP_ORDER = ['Walk', 'Run', 'Idle'] as const;
const COLUMNS = 6;
const SPACING_X = 1.5;
const SPACING_Z = 1.7;

export interface ZombiesProps {
  model: GLTF;
  count: number;
  quality: QualityLevel;
}

interface ZombieInstance {
  root: Object3D;
  mixer: AnimationMixer;
  /** Las instancias por encima de `maxAnimatedZombies` quedan en pose fija. */
  animated: boolean;
}

interface ZombieBatch {
  group: Group;
  instances: ZombieInstance[];
  dispose: () => void;
}

function isMesh(object: object): object is Mesh {
  return (object as { isMesh?: boolean }).isMesh === true;
}

function isStandardMaterial(material: Material | undefined): material is MeshStandardMaterial {
  return (
    (material as { isMeshStandardMaterial?: boolean } | undefined)?.isMeshStandardMaterial === true
  );
}

function findBaseColorMap(scene: Object3D): Texture | null {
  let map: Texture | null = null;
  scene.traverse((object) => {
    if (map || !isMesh(object)) return;
    const material: Material | undefined = Array.isArray(object.material)
      ? object.material[0]
      : object.material;
    if (isStandardMaterial(material)) map = material.map;
  });
  return map;
}

function buildBatch(model: GLTF, count: number, quality: QualityLevel): ZombieBatch {
  const group = new Group();
  group.name = 'Zombies';
  const toon = createToonMaterial({ map: findBaseColorMap(model.scene) });
  const hullMaterial = createOutlineHullMaterial(OUTLINE_HULL_THICKNESS[quality]);
  const maxAnimated = QUALITY_LEVELS[quality].maxAnimatedZombies;
  const instances: ZombieInstance[] = [];

  for (let i = 0; i < count; i++) {
    const root = cloneSkeleton(model.scene);
    const skinned: SkinnedMesh[] = [];
    root.traverse((object) => {
      if (isSkinnedMesh(object)) skinned.push(object);
    });
    for (const mesh of skinned) {
      mesh.material = toon;
      mesh.frustumCulled = false;
      createOutlineHull(mesh, hullMaterial);
    }

    const column = i % COLUMNS;
    const row = Math.floor(i / COLUMNS);
    root.position.set((column - (COLUMNS - 1) / 2) * SPACING_X, 0, (row - 2) * SPACING_Z);
    root.rotation.y = Math.PI + (column - 2.5) * 0.15;

    const mixer = new AnimationMixer(root);
    const clipName = CLIP_ORDER[i % CLIP_ORDER.length]!;
    const clip = AnimationClip.findByName(model.animations, clipName) ?? model.animations[0];
    if (clip) {
      const action = mixer.clipAction(clip);
      action.play();
      action.time = (i * 0.37) % clip.duration;
      mixer.update(0);
    }

    instances.push({ root, mixer, animated: i < maxAnimated });
    group.add(root);
  }

  return {
    group,
    instances,
    dispose: () => {
      for (const instance of instances) {
        instance.mixer.stopAllAction();
        instance.mixer.uncacheRoot(instance.root);
      }
      group.clear();
      disposeToonMaterial(toon);
      hullMaterial.dispose();
    },
  };
}

/**
 * `count` clones del modelo (`SkeletonUtils.clone`: cada uno con su esqueleto), material toon
 * compartido, inverted hull por calidad y un `AnimationMixer` por instancia con clips
 * desfasados. Solo se animan hasta `QUALITY_LEVELS[quality].maxAnimatedZombies`.
 */
export function Zombies({ model, count, quality }: ZombiesProps) {
  const batch = useMemo(() => buildBatch(model, count, quality), [model, count, quality]);

  useEffect(() => () => batch.dispose(), [batch]);

  useFrame((_state, delta) => {
    for (const instance of batch.instances) if (instance.animated) instance.mixer.update(delta);
  });

  return <primitive object={batch.group} />;
}
