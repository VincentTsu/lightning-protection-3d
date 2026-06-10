import { useCallback, useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { orbitControlsRef } from './orbitControlsRef';

interface Props {
  /** The object's current XZ position (from store), used to compute the drag offset */
  anchorX: number;
  anchorZ: number;
  /** Called once on drag end with the final XZ ground-plane position */
  onDragEnd: (x: number, z: number) => void;
  children: React.ReactNode;
}

/**
 * Ultra-smooth XZ ground-plane draggable.
 *
 * During drag we bypass React/Zustand entirely — the inner Three.js group's
 * `.position` is updated directly.  Only on release do we call `onDragEnd`
 * so the store can sync and recalculate.
 */
export function Draggable({ anchorX, anchorZ, onDragEnd, children }: Props) {
  const { camera, gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const dragging = useRef(false);
  const raycaster = useRef(new THREE.Raycaster());
  const groundPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));

  const intersectGround = useCallback(
    (clientX: number, clientY: number) => {
      const rect = gl.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.current.setFromCamera(ndc, camera);
      const target = new THREE.Vector3();
      const hit = raycaster.current.ray.intersectPlane(groundPlane.current, target);
      return hit ? target : null;
    },
    [camera, gl],
  );

  // --- window-level move handler: directly drive the Three.js group ---
  const onWindowMove = useCallback(
    (e: PointerEvent) => {
      if (!dragging.current || !groupRef.current) return;
      const pt = intersectGround(e.clientX, e.clientY);
      if (pt) {
        groupRef.current.position.x = pt.x - anchorX;
        groupRef.current.position.z = pt.z - anchorZ;
      }
    },
    [intersectGround, anchorX, anchorZ],
  );

  const cleanup = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    if (orbitControlsRef.current) orbitControlsRef.current.enabled = true;
    gl.domElement.style.cursor = '';
    window.removeEventListener('pointermove', onWindowMove);
    window.removeEventListener('pointerup', cleanup);
    // Sync final position to store
    if (groupRef.current) {
      const pos = groupRef.current.position;
      onDragEnd(anchorX + pos.x, anchorZ + pos.z);
      // Reset offset — store will re-render the child at the new position
      groupRef.current.position.set(0, 0, 0);
    }
  }, [gl, onWindowMove, onDragEnd, anchorX, anchorZ]);

  useEffect(() => () => cleanup(), [cleanup]);

  const handlePointerDown = useCallback(
    (e: any) => {
      e.stopPropagation();
      dragging.current = true;
      if (orbitControlsRef.current) orbitControlsRef.current.enabled = false;
      gl.domElement.style.cursor = 'grabbing';
      window.addEventListener('pointermove', onWindowMove);
      window.addEventListener('pointerup', cleanup);
    },
    [gl, onWindowMove, cleanup],
  );

  return (
    <group ref={groupRef} onPointerDown={handlePointerDown}>
      {children}
    </group>
  );
}
