export interface LightningRod {
  id: string;
  x: number;
  y: number;
  height: number;
  type: 'rod';
}

export interface LightningWire {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  height: number;
  type: 'wire';
}

export interface Equipment {
  id: string;
  x: number;
  y: number;
  height: number;
  width: number;
  depth: number;
  label: string;
}

export interface ProtectionStatus {
  equipmentId: string;
  protected: boolean;
  protectedBy: string[];
  margin: number;
}

/** 单针/单线保护范围计算结果 */
export interface RodProtectionRange {
  rodId: string;
  r0: number;           // 地面保护半径
  h0?: number;          // 双针联合最低点高度
  profiles: { hz: number; r: number }[];  // 不同高度的保护半径剖面
}

export interface WireProtectionRange {
  wireId: string;
  b0: number;           // 地面保护宽度
  profiles: { hz: number; b: number }[];
}

/** 包络面顶点数据 */
export interface EnvelopeGeometry {
  positions: Float32Array;  // 顶点坐标 [x,y,z, x,y,z, ...]
  indices: number[];        // 三角形索引
  normals: Float32Array;    // 法向量
}

/** 标注线数据 */
export interface DimensionLine {
  start: [number, number, number];
  end: [number, number, number];
  label: string;
  offset: [number, number, number];
}
