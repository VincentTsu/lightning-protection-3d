import * as THREE from 'three';

export function Ground() {
  return (
    <group>
      {/* 大地平面 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial color="#f0f0f0" side={THREE.DoubleSide} />
      </mesh>
      {/* 10m 主网格 */}
      <gridHelper args={[200, 20, '#c0c0c0', '#d8d8d8']} position={[0, 0, 0]} />
    </group>
  );
}
