import * as THREE from 'three';
import { Line, Text, Billboard } from '@react-three/drei';
import { useStore } from '../store/useStore';

export function DimensionLines() {
  const dimensions = useStore(s => s.dimensions);

  return (
    <group>
      {dimensions.map((dim, i) => {
        const points = [
          new THREE.Vector3(...dim.start),
          new THREE.Vector3(...dim.end),
        ];
        return (
          <group key={`dim-${i}`}>
            <Line
              points={points}
              color="#333333"
              lineWidth={1}
              dashed
              dashSize={1}
              gapSize={0.5}
            />
            {/* Billboard keeps text always facing the camera */}
            <Billboard position={dim.offset}>
              <Text
                fontSize={1.5}
                color="#333333"
                anchorX="left"
                anchorY="middle"
              >
                {dim.label}
              </Text>
            </Billboard>
            <mesh position={dim.start}>
              <sphereGeometry args={[0.3, 8, 8]} />
              <meshBasicMaterial color="#333333" />
            </mesh>
            <mesh position={dim.end}>
              <sphereGeometry args={[0.3, 8, 8]} />
              <meshBasicMaterial color="#333333" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
