import { LightningRod as RodType } from '../types';

interface Props {
  rod: RodType;
  selected?: boolean;
  onClick?: () => void;
}

export function LightningRod3D({ rod, selected, onClick }: Props) {
  const poleColor = selected ? '#ff4444' : '#c0392b';
  const tipColor = selected ? '#ff6666' : '#e74c3c';

  return (
    <group position={[rod.x, rod.height / 2, rod.y]} onClick={onClick}>
      {/* 杆体 */}
      <mesh castShadow>
        <cylinderGeometry args={[0.3, 0.3, rod.height, 16]} />
        <meshStandardMaterial color={poleColor} metalness={0.3} roughness={0.7} />
      </mesh>
      {/* 尖端 */}
      <mesh position={[0, rod.height / 2 + 0.3, 0]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial color={tipColor} metalness={0.5} roughness={0.3} />
      </mesh>
      {/* 选中高亮环 */}
      {selected && (
        <mesh>
          <torusGeometry args={[1.2, 0.1, 8, 32]} />
          <meshBasicMaterial color="#ff4444" />
        </mesh>
      )}
    </group>
  );
}
