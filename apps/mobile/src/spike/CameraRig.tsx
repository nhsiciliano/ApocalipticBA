import { useFrame, useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import type { PerspectiveCamera } from 'three/webgpu';

export interface CameraRigProps {
  radius?: number;
  height?: number;
  /** Radianes por segundo de la órbita. */
  speed?: number;
  far?: number;
}

/** Cámara en órbita lenta alrededor del grupo de zombies, mirando a la altura del pecho. */
export function CameraRig({ radius = 8.5, height = 2.2, speed = 0.07, far = 60 }: CameraRigProps) {
  const get = useThree((state) => state.get);

  useEffect(() => {
    const camera = get().camera as PerspectiveCamera;
    camera.near = 0.1;
    camera.far = far;
    camera.fov = 55;
    camera.updateProjectionMatrix();
  }, [get, far]);

  useFrame((state) => {
    const t = state.clock.elapsedTime * speed;
    state.camera.position.set(Math.cos(t) * radius, height, Math.sin(t) * radius);
    state.camera.lookAt(0, 1, 0);
  });

  return null;
}
