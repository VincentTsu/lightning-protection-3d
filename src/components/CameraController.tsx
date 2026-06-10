import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { orbitControlsRef } from './orbitControlsRef';

export function CameraController() {
  const { camera } = useThree();
  const controls = useRef<any>(null);

  useEffect(() => {
    orbitControlsRef.current = controls.current;
    return () => { orbitControlsRef.current = null; };
  }, []);

  useEffect(() => {
    const distance = 80;
    const phi = Math.PI / 4;       // 45° elevation
    const theta = -Math.PI / 6;    // -30° azimuth
    camera.position.set(
      distance * Math.sin(phi) * Math.cos(theta),
      distance * Math.cos(phi),
      distance * Math.sin(phi) * Math.sin(theta)
    );
    camera.lookAt(15, 5, 0);
  }, [camera]);

  return (
    <OrbitControls
      ref={controls}
      target={[15, 5, 0]}
      minDistance={5}
      maxDistance={500}
      enableDamping
      dampingFactor={0.1}
    />
  );
}
