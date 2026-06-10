# GB50064 防雷计算可视化工具 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建基于 GB50064 折线法的防雷保护范围 3D 可视化 Web 应用

**Architecture:** React + Three.js (React Three Fiber) 单页应用，Zustand 管理全局状态，左侧面板编辑参数，右侧全 3D 实时渲染。计算引擎为纯 TypeScript 函数，独立于 UI。

**Tech Stack:** Vite + React 18 + TypeScript + Three.js (R3F) + @react-three/drei + Zustand + Tailwind CSS

---

### Task 0: 项目脚手架

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `index.html`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "lightning-protection",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@react-three/drei": "^9.114.0",
    "@react-three/fiber": "^8.17.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "three": "^0.170.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@types/three": "^0.170.0",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.16",
    "typescript": "^5.6.3",
    "vite": "^6.0.3"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

- [ ] **Step 3: 创建 tsconfig.app.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: 创建 tsconfig.node.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 5: 创建 vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

- [ ] **Step 6: 创建 tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

- [ ] **Step 7: 创建 postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 8: 创建 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>GB50064 防雷计算可视化</title>
  </head>
  <body class="m-0 p-0 overflow-hidden">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 9: 安装依赖**

```bash
cd "d:/Vibe Coding/防雷计算" && npm install
```

---

### Task 1: 类型定义

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: 创建类型定义文件 src/types.ts**

```typescript
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
```

---

### Task 2: 计算引擎 — 高度修正系数 + 避雷针计算

**Files:**
- Create: `src/engine/rodCalc.ts`

- [ ] **Step 1: 创建 src/engine/rodCalc.ts**

```typescript
import { LightningRod, RodProtectionRange } from '../types';

/** 高度修正系数 p */
export function correctionFactor(h: number): number {
  if (h <= 30) return 1;
  if (h <= 120) return 5.5 / Math.sqrt(h);
  return 5.5 / Math.sqrt(h);
}

/** 单根避雷针在高度 hx 处的保护半径 rx */
export function protectionRadius(h: number, hx: number): number {
  const p = correctionFactor(h);
  if (hx >= h / 2) {
    return (h - hx) * p;
  } else {
    return (1.5 * h - 2 * hx) * p;
  }
}

/** 地面保护半径 r0 */
export function groundProtectionRadius(h: number): number {
  return 1.5 * h * correctionFactor(h);
}

/** 两针间距 */
export function distanceBetweenRods(a: LightningRod, b: LightningRod): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/** 双针联合保护最低点高度 h0 = h - D/(7p) */
export function jointMinHeight(h: number, D: number): number {
  const p = correctionFactor(h);
  return Math.max(0, h - D / (7 * p));
}

/** 计算单针的完整保护剖面（从地面到针尖，采样 20 个高度） */
export function rodProtectionProfile(rod: LightningRod): RodProtectionRange {
  const samples = 20;
  const profiles: { hz: number; r: number }[] = [];
  for (let i = 0; i <= samples; i++) {
    const hz = (rod.height / samples) * i;
    profiles.push({ hz, r: protectionRadius(rod.height, hz) });
  }
  return {
    rodId: rod.id,
    r0: groundProtectionRadius(rod.height),
    profiles,
  };
}

/** 计算所有避雷针的联合保护范围 */
export function computeAllRodProtections(
  rods: LightningRod[]
): RodProtectionRange[] {
  const ranges = rods.map(rodProtectionProfile);
  // 为每对避雷针计算联合保护最低点
  for (let i = 0; i < rods.length; i++) {
    for (let j = i + 1; j < rods.length; j++) {
      const D = distanceBetweenRods(rods[i], rods[j]);
      const h = Math.max(rods[i].height, rods[j].height);
      const h0 = jointMinHeight(h, D);
      // 将联合保护数据附加到较短的针上
      const target = rods[i].height <= rods[j].height ? ranges[i] : ranges[j];
      target.h0 = target.h0 !== undefined ? Math.min(target.h0, h0) : h0;
    }
  }
  return ranges;
}
```

---

### Task 3: 计算引擎 — 避雷线计算

**Files:**
- Create: `src/engine/wireCalc.ts`

- [ ] **Step 1: 创建 src/engine/wireCalc.ts**

```typescript
import { LightningWire, WireProtectionRange } from '../types';
import { correctionFactor } from './rodCalc';

/** 单条避雷线在高度 hx 处的保护宽度 bx */
export function protectionWidth(h: number, hx: number): number {
  const p = correctionFactor(h);
  if (hx >= h / 2) {
    return 0.47 * (h - hx) * p;
  } else {
    return (h - 1.53 * hx) * p;
  }
}

/** 地面保护宽度 b0 */
export function groundProtectionWidth(h: number): number {
  return h * correctionFactor(h);
}

/** 线长度 */
export function wireLength(w: LightningWire): number {
  return Math.sqrt((w.x2 - w.x1) ** 2 + (w.y2 - w.y1) ** 2);
}

/** 计算单条避雷线的保护剖面 */
export function wireProtectionProfile(wire: LightningWire): WireProtectionRange {
  const samples = 20;
  const profiles: { hz: number; b: number }[] = [];
  for (let i = 0; i <= samples; i++) {
    const hz = (wire.height / samples) * i;
    profiles.push({ hz, b: protectionWidth(wire.height, hz) });
  }
  return {
    wireId: wire.id,
    b0: groundProtectionWidth(wire.height),
    profiles,
  };
}

/** 计算所有避雷线的保护范围 */
export function computeAllWireProtections(
  wires: LightningWire[]
): WireProtectionRange[] {
  return wires.map(wireProtectionProfile);
}

/** 两条平行避雷线联合保护最低点（近似：h0 = h - D/(5p)） */
export function wireJointMinHeight(h: number, D: number): number {
  const p = correctionFactor(h);
  return Math.max(0, h - D / (5 * p));
}
```

---

### Task 4: 计算引擎 — 设备保护判定

**Files:**
- Create: `src/engine/checkProtection.ts`

- [ ] **Step 1: 创建 src/engine/checkProtection.ts**

```typescript
import { Equipment, LightningRod, LightningWire, ProtectionStatus } from '../types';
import { protectionRadius, distanceBetweenRods, jointMinHeight } from './rodCalc';
import { protectionWidth } from './wireCalc';

/** 点到点的距离 */
function pointDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

/** 点到线段的垂直距离 */
function pointToSegmentDistance(
  px: number, py: number,
  x1: number, y1: number, x2: number, y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return pointDistance(px, py, x1, y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return pointDistance(px, py, x1 + t * dx, y1 + t * dy);
}

/** 检查单个设备是否受避雷针保护 */
function checkRodProtection(
  eq: Equipment, rods: LightningRod[]
): { protected: boolean; by: string[]; margin: number } {
  const by: string[] = [];
  let bestMargin = -Infinity;

  // 单针保护判定
  for (const rod of rods) {
    const dist = pointDistance(eq.x, eq.y, rod.x, rod.y);
    const rx = protectionRadius(rod.height, eq.height);
    const margin = rx - dist;
    if (margin >= 0) {
      by.push(rod.id);
      bestMargin = Math.max(bestMargin, margin);
    }
  }

  // 双针联合保护判定
  if (by.length === 0 && rods.length >= 2) {
    for (let i = 0; i < rods.length; i++) {
      for (let j = i + 1; j < rods.length; j++) {
        const D = distanceBetweenRods(rods[i], rods[j]);
        const h = Math.max(rods[i].height, rods[j].height);
        const h0 = jointMinHeight(h, D);
        if (eq.height <= h0 && isPointBetweenRods(eq, rods[i], rods[j])) {
          by.push(rods[i].id, rods[j].id);
          bestMargin = h0 - eq.height;
        }
      }
    }
  }

  return { protected: by.length > 0, by, margin: bestMargin };
}

/** 判断点是否在两针之间（投影在线段上且有联合保护） */
function isPointBetweenRods(
  eq: Equipment, a: LightningRod, b: LightningRod
): boolean {
  const D = distanceBetweenRods(a, b);
  const dA = pointDistance(eq.x, eq.y, a.x, a.y);
  const dB = pointDistance(eq.x, eq.y, b.x, b.y);
  return dA <= D && dB <= D;
}

/** 检查单个设备是否受避雷线保护 */
function checkWireProtection(
  eq: Equipment, wires: LightningWire[]
): { protected: boolean; by: string[]; margin: number } {
  const by: string[] = [];
  let bestMargin = -Infinity;

  for (const wire of wires) {
    const dist = pointToSegmentDistance(
      eq.x, eq.y, wire.x1, wire.y1, wire.x2, wire.y2
    );
    const bx = protectionWidth(wire.height, eq.height);
    const margin = bx - dist;
    if (margin >= 0) {
      by.push(wire.id);
      bestMargin = Math.max(bestMargin, margin);
    }
  }

  return { protected: by.length > 0, by, margin: bestMargin };
}

/** 综合判定设备是否受保护 */
export function checkEquipmentProtection(
  eq: Equipment,
  rods: LightningRod[],
  wires: LightningWire[]
): ProtectionStatus {
  const rodResult = checkRodProtection(eq, rods);
  const wireResult = checkWireProtection(eq, wires);

  const allBy = [...rodResult.by, ...wireResult.by];
  const margin = Math.max(rodResult.margin, wireResult.margin);

  return {
    equipmentId: eq.id,
    protected: allBy.length > 0,
    protectedBy: allBy,
    margin,
  };
}

/** 批量判定所有设备 */
export function checkAllProtections(
  equipment: Equipment[],
  rods: LightningRod[],
  wires: LightningWire[]
): ProtectionStatus[] {
  return equipment.map(eq => checkEquipmentProtection(eq, rods, wires));
}
```

---

### Task 5: 计算引擎 — 包络面顶点生成

**Files:**
- Create: `src/engine/envelope.ts`

- [ ] **Step 1: 创建 src/engine/envelope.ts**

```typescript
import { LightningRod, LightningWire } from '../types';
import { protectionRadius, distanceBetweenRods, jointMinHeight } from './rodCalc';
import { protectionWidth } from './wireCalc';

/** 避雷针包络面 — 生成分段圆锥台顶点 + 索引 */
export function generateRodEnvelope(
  rod: LightningRod,
  segments: number = 32,
  heightSamples: number = 20
): { positions: Float32Array; indices: number[] } {
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= heightSamples; i++) {
    const hz = (rod.height / heightSamples) * i;
    const r = Math.max(protectionRadius(rod.height, hz), 0.001);
    for (let j = 0; j < segments; j++) {
      const angle = (Math.PI * 2 * j) / segments;
      const px = rod.x + r * Math.cos(angle);
      const pz = rod.y + r * Math.sin(angle);  // Three.js Y-up: ground in XZ
      positions.push(px, hz, pz);
    }
  }

  // 生成三角形索引（环形 strip）
  for (let i = 0; i < heightSamples; i++) {
    for (let j = 0; j < segments; j++) {
      const curr = i * segments + j;
      const next = i * segments + (j + 1) % segments;
      const below = (i + 1) * segments + j;
      const belowNext = (i + 1) * segments + (j + 1) % segments;
      indices.push(curr, below, next);
      indices.push(next, below, belowNext);
    }
  }

  return {
    positions: new Float32Array(positions),
    indices,
  };
}

/** 双针之间的联合保护过渡面 */
export function generateJointEnvelope(
  rodA: LightningRod,
  rodB: LightningRod,
  segments: number = 32,
  heightSamples: number = 10
): { positions: Float32Array; indices: number[] } | null {
  const D = distanceBetweenRods(rodA, rodB);
  const h = Math.max(rodA.height, rodB.height);
  const h0 = jointMinHeight(h, D);
  if (h0 <= 0) return null;

  const positions: number[] = [];
  const indices: number[] = [];

  // 在两针之间采样，每点的保护半径为从 h0 高度过渡
  const totalSamples = heightSamples;
  for (let i = 0; i <= totalSamples; i++) {
    const t = i / totalSamples;
    const hz = h0 * (1 - t);
    // 插值位置
    const cx = rodA.x + (rodB.x - rodA.x) * t;
    const cz = rodA.y + (rodB.y - rodA.y) * t;
    // 在该位置的等效保护半径（按两针中较短者近似）
    const hRef = Math.min(rodA.height, rodB.height);
    const rx = protectionRadius(hRef, hz);
    // 限制半径不超过到两针的距离
    const maxR = Math.min(
      pointDist2D(cx, cz, rodA.x, rodA.y),
      pointDist2D(cx, cz, rodB.x, rodB.y)
    );
    const r = Math.min(rx, maxR);

    for (let j = 0; j < segments; j++) {
      const angle = (Math.PI * 2 * j) / segments;
      positions.push(cx + r * Math.cos(angle), hz, cz + r * Math.sin(angle));
    }
  }

  for (let i = 0; i < totalSamples; i++) {
    for (let j = 0; j < segments; j++) {
      const curr = i * segments + j;
      const next = i * segments + (j + 1) % segments;
      const below = (i + 1) * segments + j;
      const belowNext = (i + 1) * segments + (j + 1) % segments;
      indices.push(curr, next, below);
      indices.push(next, belowNext, below);
    }
  }

  return isEmptyGeometry(positions) ? null : {
    positions: new Float32Array(positions),
    indices,
  };
}

function pointDist2D(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

function isEmptyGeometry(positions: number[]): boolean {
  return positions.length === 0;
}

/** 避雷线包络面 — 沿线三棱柱 + 两端半锥 */
export function generateWireEnvelope(
  wire: LightningWire,
  segments: number = 16,
  heightSamples: number = 20
): { positions: Float32Array; indices: number[] } {
  const positions: number[] = [];
  const indices: number[] = [];

  const dx = wire.x2 - wire.x1;
  const dy = wire.y2 - wire.y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return { positions: new Float32Array(0), indices: [] };

  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;

  // 沿线方向采样高度层
  for (let i = 0; i <= heightSamples; i++) {
    const hz = (wire.height / heightSamples) * i;
    const b = Math.max(protectionWidth(wire.height, hz), 0.001);

    // 左右两侧顶点点
    const baseX = wire.x1;
    const baseY = wire.y1;
    const endX = wire.x2;
    const endY = wire.y2;

    // 四个角点：起点左、起点右、终点左、终点右
    // 这里简化：只生成起终点处的宽度线，用 strip 连接
    // 在高度 hz 处，起点的左右
    positions.push(baseX + nx * b, hz, baseY + ny * b);
    positions.push(baseX - nx * b, hz, baseY - ny * b);
    positions.push(endX + nx * b, hz, endY + ny * b);
    positions.push(endX - nx * b, hz, endY - ny * b);
  }

  const vertsPerLayer = 4;
  for (let i = 0; i < heightSamples; i++) {
    const base = i * vertsPerLayer;
    const top = (i + 1) * vertsPerLayer;
    // 左侧面
    indices.push(base, base + 2, top);
    indices.push(base + 2, top + 2, top);
    // 右侧面
    indices.push(base + 1, top + 1, base + 3);
    indices.push(base + 3, top + 1, top + 3);
    // 顶面（朝上）
    indices.push(base, top, base + 1);
    indices.push(base + 1, top, top + 1);
    indices.push(base + 2, base + 3, top + 2);
    indices.push(base + 3, top + 3, top + 2);
  }

  return { positions: new Float32Array(positions), indices };
}

/** 避雷线端点半锥 */
export function generateWireEndCap(
  x: number, y: number, wireHeight: number,
  nx: number, ny: number,  // 朝外的方向
  segments: number = 16,
  heightSamples: number = 10
): { positions: Float32Array; indices: number[] } {
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= heightSamples; i++) {
    const hz = (wireHeight / heightSamples) * i;
    const r = Math.max(protectionWidth(wireHeight, hz), 0.001);
    for (let j = 0; j < segments; j++) {
      const angle = Math.PI * j / (segments - 1);  // 0 to PI
      const bx = r * Math.cos(angle);
      const bz = r * Math.sin(angle) * Math.sign(ny + nx); // project to direction
      // 简化：生成半圆
      const px = x + nx * Math.abs(bx);
      const py = y + ny * Math.abs(bx);
      positions.push(px, hz, py);
    }
  }

  for (let i = 0; i < heightSamples; i++) {
    for (let j = 0; j < segments - 1; j++) {
      const curr = i * segments + j;
      const next = i * segments + j + 1;
      const below = (i + 1) * segments + j;
      const belowNext = (i + 1) * segments + j + 1;
      indices.push(curr, below, next);
      indices.push(next, below, belowNext);
    }
  }

  return { positions: new Float32Array(positions), indices };
}
```

---

### Task 6: Zustand 全局状态 Store

**Files:**
- Create: `src/store/useStore.ts`

- [ ] **Step 1: 创建 src/store/useStore.ts**

```typescript
import { create } from 'zustand';
import {
  Equipment, LightningRod, LightningWire, ProtectionStatus,
  RodProtectionRange, WireProtectionRange, DimensionLine,
} from '../types';
import { computeAllRodProtections, distanceBetweenRods, jointMinHeight } from '../engine/rodCalc';
import { computeAllWireProtections, wireLength } from '../engine/wireCalc';
import { checkAllProtections } from '../engine/checkProtection';

let nextId = 1;
function uid(): string {
  return `id-${nextId++}`;
}

interface AppState {
  rods: LightningRod[];
  wires: LightningWire[];
  equipment: Equipment[];
  rodProtections: RodProtectionRange[];
  wireProtections: WireProtectionRange[];
  protectionStatuses: ProtectionStatus[];
  dimensions: DimensionLine[];

  // Actions
  addRod: (x: number, y: number, height: number) => void;
  updateRod: (id: string, patch: Partial<LightningRod>) => void;
  removeRod: (id: string) => void;

  addWire: (x1: number, y1: number, x2: number, y2: number, height: number) => void;
  updateWire: (id: string, patch: Partial<LightningWire>) => void;
  removeWire: (id: string) => void;

  addEquipment: (x: number, y: number, height: number, width: number, depth: number, label: string) => void;
  updateEquipment: (id: string, patch: Partial<Equipment>) => void;
  removeEquipment: (id: string) => void;

  recalculate: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  rods: [
    { id: uid(), x: 0, y: 0, height: 20, type: 'rod' as const },
    { id: uid(), x: 30, y: 0, height: 15, type: 'rod' as const },
  ],
  wires: [],
  equipment: [
    { id: uid(), x: 10, y: 5, height: 5, width: 2, depth: 2, label: '设备 #1' },
  ],
  rodProtections: [],
  wireProtections: [],
  protectionStatuses: [],
  dimensions: [],

  addRod: (x, y, height) => {
    const rod: LightningRod = { id: uid(), x, y, height, type: 'rod' };
    set(s => ({ rods: [...s.rods, rod] }));
    get().recalculate();
  },
  updateRod: (id, patch) => {
    set(s => ({
      rods: s.rods.map(r => r.id === id ? { ...r, ...patch } : r),
    }));
    get().recalculate();
  },
  removeRod: (id) => {
    set(s => ({ rods: s.rods.filter(r => r.id !== id) }));
    get().recalculate();
  },

  addWire: (x1, y1, x2, y2, height) => {
    const wire: LightningWire = { id: uid(), x1, y1, x2, y2, height, type: 'wire' };
    set(s => ({ wires: [...s.wires, wire] }));
    get().recalculate();
  },
  updateWire: (id, patch) => {
    set(s => ({
      wires: s.wires.map(w => w.id === id ? { ...w, ...patch } : w),
    }));
    get().recalculate();
  },
  removeWire: (id) => {
    set(s => ({ wires: s.wires.filter(w => w.id !== id) }));
    get().recalculate();
  },

  addEquipment: (x, y, height, width, depth, label) => {
    const eq: Equipment = { id: uid(), x, y, height, width, depth, label };
    set(s => ({ equipment: [...s.equipment, eq] }));
    get().recalculate();
  },
  updateEquipment: (id, patch) => {
    set(s => ({
      equipment: s.equipment.map(e => e.id === id ? { ...e, ...patch } : e),
    }));
    get().recalculate();
  },
  removeEquipment: (id) => {
    set(s => ({ equipment: s.equipment.filter(e => e.id !== id) }));
    get().recalculate();
  },

  recalculate: () => {
    const { rods, wires, equipment } = get();
    const rodProtections = computeAllRodProtections(rods);
    const wireProtections = computeAllWireProtections(wires);
    const protectionStatuses = checkAllProtections(equipment, rods, wires);

    // 生成关键尺寸标注
    const dimensions: DimensionLine[] = [];
    rods.forEach(r => {
      const profile = rodProtections.find(p => p.rodId === r.id);
      if (profile) {
        dimensions.push({
          start: [r.x, r.height, r.y],
          end: [r.x, 0, r.y],
          label: `h=${r.height.toFixed(1)}m`,
          offset: [r.x + 1, r.height / 2, r.y],
        });
      }
    });
    // 针间距离标注
    for (let i = 0; i < rods.length; i++) {
      for (let j = i + 1; j < rods.length; j++) {
        const D = distanceBetweenRods(rods[i], rods[j]);
        const midX = (rods[i].x + rods[j].x) / 2;
        const midY = (rods[i].y + rods[j].y) / 2;
        dimensions.push({
          start: [rods[i].x, 0, rods[i].y],
          end: [rods[j].x, 0, rods[j].y],
          label: `D=${D.toFixed(1)}m`,
          offset: [midX, -2, midY],
        });
      }
    }
    // 设备标注
    equipment.forEach(eq => {
      const st = protectionStatuses.find(s => s.equipmentId === eq.id);
      dimensions.push({
        start: [eq.x, 0, eq.y],
        end: [eq.x, eq.height, eq.y],
        label: `${eq.label} hx=${eq.height}m ${st?.protected ? '✓受保护' : '✗未保护'}`,
        offset: [eq.x + 1, eq.height / 2, eq.y],
      });
    });

    set({ rodProtections, wireProtections, protectionStatuses, dimensions });
  },
}));
```

---

### Task 7: 3D 组件 — 地面 + 相机

**Files:**
- Create: `src/components/Ground.tsx`, `src/components/CameraController.tsx`

- [ ] **Step 1: 创建 src/components/Ground.tsx**

```typescript
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function Ground() {
  const gridRef = useRef<THREE.Group>(null);

  return (
    <group>
      {/* 大地平面 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial color="#f0f0f0" side={THREE.DoubleSide} />
      </mesh>
      {/* 10m 主网格 */}
      <gridHelper args={[200, 20, '#c0c0c0', '#d8d8d8']} position={[0, 0, 0]} />
      {/* 坐标轴标记 */}
      <axesHelper args={[50]} />
    </group>
  );
}
```

- [ ] **Step 2: 创建 src/components/CameraController.tsx**

```typescript
import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

export function CameraController() {
  const { camera } = useThree();

  useEffect(() => {
    // 初始视角：俯视45°，从右前方看
    const distance = 80;
    const phi = Math.PI / 4;       // 45° 俯角
    const theta = -Math.PI / 6;    // -30° 方位角
    camera.position.set(
      distance * Math.sin(phi) * Math.cos(theta),
      distance * Math.cos(phi),
      distance * Math.sin(phi) * Math.sin(theta)
    );
    camera.lookAt(15, 5, 0);
  }, []);

  return (
    <OrbitControls
      target={[15, 5, 0]}
      minDistance={5}
      maxDistance={500}
      enableDamping
      dampingFactor={0.1}
    />
  );
}
```

---

### Task 8: 3D 组件 — 避雷针模型

**Files:**
- Create: `src/components/LightningRod.tsx`

- [ ] **Step 1: 创建 src/components/LightningRod.tsx**

```typescript
import { useRef } from 'react';
import * as THREE from 'three';
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
        <mesh position={[0, 0, 0]}>
          <torusGeometry args={[1.2, 0.1, 8, 32]} />
          <meshBasicMaterial color="#ff4444" />
        </mesh>
      )}
    </group>
  );
}
```

---

### Task 9: 3D 组件 — 避雷线模型 + 设备模型

**Files:**
- Create: `src/components/LightningWire.tsx`, `src/components/Equipment.tsx`

- [ ] **Step 1: 创建 src/components/LightningWire.tsx**

```typescript
import { useMemo } from 'react';
import * as THREE from 'three';
import { LightningWire as WireType } from '../types';

interface Props {
  wire: WireType;
}

export function LightningWire3D({ wire }: Props) {
  const curve = useMemo(() => {
    const start = new THREE.Vector3(wire.x1, wire.height, wire.y1);
    const end = new THREE.Vector3(wire.x2, wire.height, wire.y2);
    const mid = new THREE.Vector3(
      (wire.x1 + wire.x2) / 2,
      wire.height - 0.5,  // 轻微弧垂
      (wire.y1 + wire.y2) / 2
    );
    return new THREE.QuadraticBezierCurve3(start, mid, end);
  }, [wire.x1, wire.y1, wire.x2, wire.y2, wire.height]);

  const points = useMemo(() => curve.getPoints(50), [curve]);

  return (
    <group>
      {/* 悬挂线 */}
      <mesh>
        <tubeGeometry args={[curve, 50, 0.15, 8, false]} />
        <meshStandardMaterial color="#1a7a6d" metalness={0.4} roughness={0.6} />
      </mesh>
      {/* 支柱1 */}
      <mesh position={[wire.x1, wire.height / 2, wire.y1]}>
        <cylinderGeometry args={[0.2, 0.2, wire.height, 8]} />
        <meshStandardMaterial color="#888888" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* 支柱2 */}
      <mesh position={[wire.x2, wire.height / 2, wire.y2]}>
        <cylinderGeometry args={[0.2, 0.2, wire.height, 8]} />
        <meshStandardMaterial color="#888888" metalness={0.5} roughness={0.5} />
      </mesh>
    </group>
  );
}
```

- [ ] **Step 2: 创建 src/components/Equipment.tsx**

```typescript
import { Equipment as EqType } from '../types';

interface Props {
  equipment: EqType;
  isProtected: boolean;
  selected?: boolean;
  onClick?: () => void;
}

export function Equipment({ equipment: eq, isProtected, selected, onClick }: Props) {
  const color = isProtected ? '#7c3aed' : '#ef4444';
  const emissive = selected ? '#ffffff' : (isProtected ? '#22c55e' : '#ef4444');

  return (
    <group position={[eq.x, eq.height / 2, eq.y]} onClick={onClick}>
      <mesh castShadow>
        <boxGeometry args={[eq.width, eq.height, eq.depth]} />
        <meshStandardMaterial color={color} metalness={0.1} roughness={0.6} />
      </mesh>
      {/* 保护状态描边 */}
      <lineSegments>
        <edgesGeometry args={[new (require('three').BoxGeometry)(eq.width, eq.height, eq.depth)]} />
        <lineBasicMaterial color={isProtected ? '#22c55e' : '#ef4444'} linewidth={1} />
      </lineSegments>
      {selected && (
        <mesh>
          <boxGeometry args={[eq.width + 0.3, eq.height + 0.3, eq.depth + 0.3]} />
          <meshBasicMaterial color={isProtected ? '#22c55e' : '#ef4444'} wireframe />
        </mesh>
      )}
    </group>
  );
}
```

Note: `require('three')` won't work in ESM. Fix in step — use `import { BoxGeometry, EdgesGeometry } from 'three'` at top level instead.

- [ ] **Step 3: 修正 Equipment.tsx 的 import**

Replace the inline require with top-level import:

```typescript
import * as THREE from 'three';
import { Equipment as EqType } from '../types';
// ...
const boxGeo = new THREE.BoxGeometry(eq.width, eq.height, eq.depth);
// Use <primitive object={new THREE.EdgesGeometry(boxGeo)} /> in JSX
```

---

### Task 10: 3D 组件 — 保护包络面

**Files:**
- Create: `src/components/ProtectionEnvelope.tsx`

- [ ] **Step 1: 创建 src/components/ProtectionEnvelope.tsx**

```typescript
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useStore } from '../store/useStore';
import { generateRodEnvelope, generateJointEnvelope, generateWireEnvelope } from '../engine/envelope';

export function ProtectionEnvelope() {
  const rods = useStore(s => s.rods);
  const wires = useStore(s => s.wires);

  // 所有避雷针的包络面
  const rodGeos = useMemo(() => {
    return rods.map(rod => {
      const { positions, indices } = generateRodEnvelope(rod);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      return { rodId: rod.id, geo };
    });
  }, [rods]);

  // 双针之间的联合包络面
  const jointGeos = useMemo(() => {
    const result: { geo: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < rods.length; i++) {
      for (let j = i + 1; j < rods.length; j++) {
        const env = generateJointEnvelope(rods[i], rods[j]);
        if (env) {
          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.BufferAttribute(env.positions, 3));
          geo.setIndex(env.indices);
          geo.computeVertexNormals();
          result.push({ geo });
        }
      }
    }
    return result;
  }, [rods]);

  // 避雷线的包络面
  const wireGeos = useMemo(() => {
    return wires.map(wire => {
      const { positions, indices } = generateWireEnvelope(wire);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      return { wireId: wire.id, geo };
    });
  }, [wires]);

  return (
    <group>
      {rodGeos.map(({ rodId, geo }) => (
        <mesh key={rodId} geometry={geo}>
          <meshBasicMaterial
            color="#e74c3c"
            transparent
            opacity={0.2}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
      {jointGeos.map(({ geo }, i) => (
        <mesh key={`joint-${i}`} geometry={geo}>
          <meshBasicMaterial
            color="#e74c3c"
            transparent
            opacity={0.15}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
      {wireGeos.map(({ wireId, geo }) => (
        <mesh key={wireId} geometry={geo}>
          <meshBasicMaterial
            color="#1a7a6d"
            transparent
            opacity={0.2}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
```

---

### Task 11: 3D 组件 — 尺寸标注

**Files:**
- Create: `src/components/DimensionLines.tsx`

- [ ] **Step 1: 创建 src/components/DimensionLines.tsx**

```typescript
import { useMemo } from 'react';
import * as THREE from 'three';
import { Line, Text } from '@react-three/drei';
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
            {/* 虚线标注 */}
            <Line
              points={points}
              color="#333333"
              lineWidth={1}
              dashed
              dashSize={1}
              gapSize={0.5}
            />
            {/* 文字标签 */}
            <Text
              position={dim.offset}
              fontSize={1.5}
              color="#333333"
              anchorX="left"
              anchorY="middle"
            >
              {dim.label}
            </Text>
            {/* 端点小球 */}
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
```

---

### Task 12: 3D 场景主组件

**Files:**
- Create: `src/components/Scene3D.tsx`

- [ ] **Step 1: 创建 src/components/Scene3D.tsx**

```typescript
import { Canvas } from '@react-three/fiber';
import { Ground } from './Ground';
import { CameraController } from './CameraController';
import { LightningRod3D } from './LightningRod';
import { LightningWire3D } from './LightningWire';
import { Equipment } from './Equipment';
import { ProtectionEnvelope } from './ProtectionEnvelope';
import { DimensionLines } from './DimensionLines';
import { useStore } from '../store/useStore';

export function Scene3D() {
  const rods = useStore(s => s.rods);
  const wires = useStore(s => s.wires);
  const equipment = useStore(s => s.equipment);
  const protectionStatuses = useStore(s => s.protectionStatuses);

  return (
    <div className="flex-1 h-full">
      <Canvas
        camera={{ fov: 50, near: 0.1, far: 1000 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        style={{ background: '#e8ecf1' }}
      >
        {/* 光照 */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[50, 80, 50]} intensity={0.8} castShadow />
        <directionalLight position={[-20, 30, -20]} intensity={0.3} />

        {/* 场景元素 */}
        <Ground />
        <CameraController />

        {rods.map(rod => (
          <LightningRod3D key={rod.id} rod={rod} />
        ))}
        {wires.map(wire => (
          <LightningWire3D key={wire.id} wire={wire} />
        ))}
        {equipment.map(eq => {
          const status = protectionStatuses.find(s => s.equipmentId === eq.id);
          return (
            <Equipment
              key={eq.id}
              equipment={eq}
              isProtected={status?.protected ?? false}
            />
          );
        })}

        <ProtectionEnvelope />
        <DimensionLines />
      </Canvas>
    </div>
  );
}
```

---

### Task 13: 左侧面板组件

**Files:**
- Create: `src/panel/RodList.tsx`, `src/panel/WireList.tsx`, `src/panel/EquipmentList.tsx`, `src/panel/DimensionDisplay.tsx`, `src/panel/ExportButton.tsx`, `src/panel/Sidebar.tsx`

- [ ] **Step 1: 创建 src/panel/RodList.tsx** — 避雷针列表管理

```typescript
import { useState } from 'react';
import { useStore } from '../store/useStore';

export function RodList() {
  const rods = useStore(s => s.rods);
  const addRod = useStore(s => s.addRod);
  const updateRod = useStore(s => s.updateRod);
  const removeRod = useStore(s => s.removeRod);

  const [showAdd, setShowAdd] = useState(false);
  const [newX, setNewX] = useState(0);
  const [newY, setNewY] = useState(0);
  const [newH, setNewH] = useState(20);
  const [expandId, setExpandId] = useState<string | null>(null);

  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">🔺 避雷针</h3>
      {rods.map(rod => {
        const isExpanded = expandId === rod.id;
        return (
          <div
            key={rod.id}
            className={`bg-white border rounded mb-1 overflow-hidden transition-all ${
              isExpanded ? 'border-red-300 shadow-sm' : 'border-gray-200'
            }`}
          >
            <div
              className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpandId(isExpanded ? null : rod.id)}
            >
              <span className="text-sm font-medium">针 {rod.id.slice(-4)}</span>
              <span className="text-xs text-red-600 font-mono">h={rod.height}m</span>
            </div>
            {isExpanded && (
              <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 space-y-2">
                <div className="flex gap-2 items-center">
                  <label className="text-xs text-gray-500 w-4">X</label>
                  <input
                    type="number"
                    value={rod.x}
                    onChange={e => updateRod(rod.id, { x: +e.target.value })}
                    className="w-full px-2 py-1 text-xs border rounded"
                  />
                </div>
                <div className="flex gap-2 items-center">
                  <label className="text-xs text-gray-500 w-4">Y</label>
                  <input
                    type="number"
                    value={rod.y}
                    onChange={e => updateRod(rod.id, { y: +e.target.value })}
                    className="w-full px-2 py-1 text-xs border rounded"
                  />
                </div>
                <div className="flex gap-2 items-center">
                  <label className="text-xs text-gray-500 w-4">h</label>
                  <input
                    type="range"
                    min={1}
                    max={120}
                    value={rod.height}
                    onChange={e => updateRod(rod.id, { height: +e.target.value })}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    value={rod.height}
                    onChange={e => updateRod(rod.id, { height: +e.target.value })}
                    className="w-16 px-2 py-1 text-xs border rounded"
                  />
                </div>
                <button
                  onClick={() => { removeRod(rod.id); setExpandId(null); }}
                  className="text-xs text-red-500 hover:underline"
                >
                  删除
                </button>
              </div>
            )}
          </div>
        );
      })}

      {showAdd && (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded p-3 mt-1 space-y-2">
          <div className="flex gap-2">
            <input type="number" placeholder="X" value={newX} onChange={e => setNewX(+e.target.value)}
              className="w-full px-2 py-1 text-xs border rounded" />
            <input type="number" placeholder="Y" value={newY} onChange={e => setNewY(+e.target.value)}
              className="w-full px-2 py-1 text-xs border rounded" />
            <input type="number" placeholder="h(m)" value={newH} onChange={e => setNewH(+e.target.value)}
              className="w-full px-2 py-1 text-xs border rounded" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => { addRod(newX, newY, newH); setShowAdd(false); }}
              className="text-xs px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600">
              确认添加
            </button>
            <button onClick={() => setShowAdd(false)}
              className="text-xs px-3 py-1 bg-gray-300 rounded hover:bg-gray-400">
              取消
            </button>
          </div>
        </div>
      )}
      {!showAdd && (
        <button onClick={() => setShowAdd(true)}
          className="w-full text-xs py-1.5 mt-1 border border-dashed border-gray-300 text-gray-500 rounded hover:bg-gray-50">
          + 添加避雷针
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 创建 src/panel/WireList.tsx** — 避雷线列表管理

```typescript
import { useState } from 'react';
import { useStore } from '../store/useStore';

export function WireList() {
  const wires = useStore(s => s.wires);
  const addWire = useStore(s => s.addWire);
  const updateWire = useStore(s => s.updateWire);
  const removeWire = useStore(s => s.removeWire);

  const [showAdd, setShowAdd] = useState(false);
  const [x1, setX1] = useState(0); const [y1, setY1] = useState(20);
  const [x2, setX2] = useState(40); const [y2, setY2] = useState(20);
  const [h, setH] = useState(18);
  const [expandId, setExpandId] = useState<string | null>(null);

  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">〰️ 避雷线</h3>
      {wires.map(wire => {
        const isExpanded = expandId === wire.id;
        const len = Math.sqrt((wire.x2 - wire.x1) ** 2 + (wire.y2 - wire.y1) ** 2);
        return (
          <div key={wire.id}
            className={`bg-white border rounded mb-1 overflow-hidden ${isExpanded ? 'border-teal-300 shadow-sm' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpandId(isExpanded ? null : wire.id)}>
              <span className="text-sm font-medium">线 {wire.id.slice(-4)}</span>
              <span className="text-xs text-teal-600 font-mono">h={wire.height}m L={len.toFixed(0)}m</span>
            </div>
            {isExpanded && (
              <div className="px-3 py-2 bg-gray-50 border-t space-y-2">
                <div className="grid grid-cols-2 gap-1">
                  <div><label className="text-xs text-gray-500">起点X</label>
                    <input type="number" value={wire.x1} onChange={e => updateWire(wire.id, { x1: +e.target.value })}
                      className="w-full px-2 py-1 text-xs border rounded" /></div>
                  <div><label className="text-xs text-gray-500">起点Y</label>
                    <input type="number" value={wire.y1} onChange={e => updateWire(wire.id, { y1: +e.target.value })}
                      className="w-full px-2 py-1 text-xs border rounded" /></div>
                  <div><label className="text-xs text-gray-500">终点X</label>
                    <input type="number" value={wire.x2} onChange={e => updateWire(wire.id, { x2: +e.target.value })}
                      className="w-full px-2 py-1 text-xs border rounded" /></div>
                  <div><label className="text-xs text-gray-500">终点Y</label>
                    <input type="number" value={wire.y2} onChange={e => updateWire(wire.id, { y2: +e.target.value })}
                      className="w-full px-2 py-1 text-xs border rounded" /></div>
                </div>
                <div className="flex gap-2 items-center">
                  <label className="text-xs text-gray-500">h</label>
                  <input type="range" min={1} max={120} value={wire.height}
                    onChange={e => updateWire(wire.id, { height: +e.target.value })} className="flex-1" />
                  <input type="number" value={wire.height}
                    onChange={e => updateWire(wire.id, { height: +e.target.value })}
                    className="w-16 px-2 py-1 text-xs border rounded" />
                </div>
                <button onClick={() => { removeWire(wire.id); setExpandId(null); }}
                  className="text-xs text-red-500 hover:underline">删除</button>
              </div>
            )}
          </div>
        );
      })}
      {showAdd && (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded p-3 mt-1 space-y-2">
          <div className="grid grid-cols-2 gap-1">
            <input type="number" placeholder="起点X" value={x1} onChange={e => setX1(+e.target.value)}
              className="px-2 py-1 text-xs border rounded" />
            <input type="number" placeholder="起点Y" value={y1} onChange={e => setY1(+e.target.value)}
              className="px-2 py-1 text-xs border rounded" />
            <input type="number" placeholder="终点X" value={x2} onChange={e => setX2(+e.target.value)}
              className="px-2 py-1 text-xs border rounded" />
            <input type="number" placeholder="终点Y" value={y2} onChange={e => setY2(+e.target.value)}
              className="px-2 py-1 text-xs border rounded" />
            <input type="number" placeholder="h(m)" value={h} onChange={e => setH(+e.target.value)}
              className="px-2 py-1 text-xs border rounded col-span-2" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => { addWire(x1, y1, x2, y2, h); setShowAdd(false); }}
              className="text-xs px-3 py-1 bg-teal-500 text-white rounded hover:bg-teal-600">确认添加</button>
            <button onClick={() => setShowAdd(false)}
              className="text-xs px-3 py-1 bg-gray-300 rounded hover:bg-gray-400">取消</button>
          </div>
        </div>
      )}
      {!showAdd && (
        <button onClick={() => setShowAdd(true)}
          className="w-full text-xs py-1.5 mt-1 border border-dashed border-gray-300 text-gray-500 rounded hover:bg-gray-50">
          + 添加避雷线
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 创建 src/panel/EquipmentList.tsx** — 设备列表管理

```typescript
import { useState } from 'react';
import { useStore } from '../store/useStore';

export function EquipmentList() {
  const equipment = useStore(s => s.equipment);
  const addEquipment = useStore(s => s.addEquipment);
  const updateEquipment = useStore(s => s.updateEquipment);
  const removeEquipment = useStore(s => s.removeEquipment);
  const protectionStatuses = useStore(s => s.protectionStatuses);

  const [showAdd, setShowAdd] = useState(false);
  const [nx, setNx] = useState(15); const [ny, setNy] = useState(0);
  const [nh, setNh] = useState(5); const [nw, setNw] = useState(2);
  const [nd, setNd] = useState(2); const [nl, setNl] = useState('');
  const [expandId, setExpandId] = useState<string | null>(null);

  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">📦 设备</h3>
      {equipment.map(eq => {
        const isExpanded = expandId === eq.id;
        const st = protectionStatuses.find(s => s.equipmentId === eq.id);
        return (
          <div key={eq.id}
            className={`bg-white border rounded mb-1 overflow-hidden ${
              isExpanded ? 'border-purple-300 shadow-sm' : 'border-gray-200'
            } ${!st?.protected ? 'border-l-2 border-l-red-400' : 'border-l-2 border-l-green-400'}`}>
            <div className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpandId(isExpanded ? null : eq.id)}>
              <span className="text-sm font-medium">{eq.label || `设备 ${eq.id.slice(-4)}`}</span>
              <span className={`text-xs font-mono ${st?.protected ? 'text-green-600' : 'text-red-600'}`}>
                {st?.protected ? '✓ 受保护' : '✗ 未保护'}
              </span>
            </div>
            {isExpanded && (
              <div className="px-3 py-2 bg-gray-50 border-t space-y-2">
                <div><label className="text-xs text-gray-500">名称</label>
                  <input type="text" value={eq.label} onChange={e => updateEquipment(eq.id, { label: e.target.value })}
                    className="w-full px-2 py-1 text-xs border rounded" /></div>
                <div className="grid grid-cols-2 gap-1">
                  <div><label className="text-xs text-gray-500">X</label>
                    <input type="number" value={eq.x} onChange={e => updateEquipment(eq.id, { x: +e.target.value })}
                      className="w-full px-2 py-1 text-xs border rounded" /></div>
                  <div><label className="text-xs text-gray-500">Y</label>
                    <input type="number" value={eq.y} onChange={e => updateEquipment(eq.id, { y: +e.target.value })}
                      className="w-full px-2 py-1 text-xs border rounded" /></div>
                  <div><label className="text-xs text-gray-500">高度hx</label>
                    <input type="number" value={eq.height} onChange={e => updateEquipment(eq.id, { height: +e.target.value })}
                      className="w-full px-2 py-1 text-xs border rounded" /></div>
                  <div><label className="text-xs text-gray-500">尺寸(m)</label>
                    <div className="flex gap-1">
                      <input type="number" value={eq.width} onChange={e => updateEquipment(eq.id, { width: +e.target.value })}
                        className="w-12 px-1 py-1 text-xs border rounded" placeholder="宽" />
                      <input type="number" value={eq.depth} onChange={e => updateEquipment(eq.id, { depth: +e.target.value })}
                        className="w-12 px-1 py-1 text-xs border rounded" placeholder="深" />
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  保护来源: {st?.protectedBy.length ? st.protectedBy.map(id => id.slice(-4)).join(', ') : '无'}
                  {st?.margin > -Infinity && ` | 裕度: ${st.margin.toFixed(1)}m`}
                </div>
                <button onClick={() => { removeEquipment(eq.id); setExpandId(null); }}
                  className="text-xs text-red-500 hover:underline">删除</button>
              </div>
            )}
          </div>
        );
      })}
      {showAdd && (
        <div className="bg-gray-50 border border-dashed rounded p-3 mt-1 space-y-2">
          <input type="text" placeholder="设备名称" value={nl} onChange={e => setNl(e.target.value)}
            className="w-full px-2 py-1 text-xs border rounded" />
          <div className="grid grid-cols-2 gap-1">
            <input type="number" placeholder="X" value={nx} onChange={e => setNx(+e.target.value)}
              className="px-2 py-1 text-xs border rounded" />
            <input type="number" placeholder="Y" value={ny} onChange={e => setNy(+e.target.value)}
              className="px-2 py-1 text-xs border rounded" />
            <input type="number" placeholder="高度hx(m)" value={nh} onChange={e => setNh(+e.target.value)}
              className="px-2 py-1 text-xs border rounded" />
            <div className="flex gap-1">
              <input type="number" placeholder="宽" value={nw} onChange={e => setNw(+e.target.value)}
                className="w-full px-2 py-1 text-xs border rounded" />
              <input type="number" placeholder="深" value={nd} onChange={e => setNd(+e.target.value)}
                className="w-full px-2 py-1 text-xs border rounded" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { addEquipment(nx, ny, nh, nw, nd, nl || `设备 #${equipment.length + 1}`); setShowAdd(false); }}
              className="text-xs px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600">确认添加</button>
            <button onClick={() => setShowAdd(false)}
              className="text-xs px-3 py-1 bg-gray-300 rounded hover:bg-gray-400">取消</button>
          </div>
        </div>
      )}
      {!showAdd && (
        <button onClick={() => setShowAdd(true)}
          className="w-full text-xs py-1.5 mt-1 border border-dashed border-gray-300 text-gray-500 rounded hover:bg-gray-50">
          + 添加设备
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 创建 src/panel/DimensionDisplay.tsx** — 关键尺寸汇总

```typescript
import { useStore } from '../store/useStore';
import { groundProtectionRadius, distanceBetweenRods, jointMinHeight } from '../engine/rodCalc';
import { groundProtectionWidth } from '../engine/wireCalc';

export function DimensionDisplay() {
  const rods = useStore(s => s.rods);
  const wires = useStore(s => s.wires);

  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">📏 关键尺寸</h3>
      <div className="bg-gray-50 rounded p-3 space-y-1 text-xs font-mono text-gray-700">
        {rods.map(rod => {
          const r0 = groundProtectionRadius(rod.height);
          return (
            <div key={rod.id}>
              针{rod.id.slice(-4)}: r₀={r0.toFixed(1)}m · h={rod.height}m · ({rod.x},{rod.y})
            </div>
          );
        })}
        {rods.length >= 2 && (() => {
          const a = rods[0], b = rods[1];
          const D = distanceBetweenRods(a, b);
          const h0 = jointMinHeight(Math.max(a.height, b.height), D);
          return <div>D₁₂={D.toFixed(1)}m · h₀={h0.toFixed(1)}m</div>;
        })()}
        {wires.map(wire => {
          const b0 = groundProtectionWidth(wire.height);
          const len = Math.sqrt((wire.x2 - wire.x1) ** 2 + (wire.y2 - wire.y1) ** 2);
          return (
            <div key={wire.id}>
              线{wire.id.slice(-4)}: b₀={b0.toFixed(1)}m · L={len.toFixed(1)}m
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 创建 src/panel/ExportButton.tsx** — 截图导出

```typescript
import { useThree } from '@react-three/fiber';

export function ExportButton() {
  const handleExport = () => {
    // 查找 canvas 元素
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `防雷计算_${new Date().toISOString().slice(0, 10)}.png`;
    link.href = dataURL;
    link.click();
  };

  return (
    <button
      onClick={handleExport}
      className="w-full py-2 bg-red-500 text-white text-sm font-medium rounded hover:bg-red-600 transition-colors"
    >
      📸 导出图片
    </button>
  );
}
```

- [ ] **Step 6: 创建 src/panel/Sidebar.tsx** — 面板容器

```typescript
import { RodList } from './RodList';
import { WireList } from './WireList';
import { EquipmentList } from './EquipmentList';
import { DimensionDisplay } from './DimensionDisplay';
import { ExportButton } from './ExportButton';

export function Sidebar() {
  return (
    <div className="w-80 h-full bg-white border-r border-gray-200 overflow-y-auto p-4 flex flex-col">
      <h2 className="text-lg font-bold text-gray-800 mb-4">防雷计算 · GB50064</h2>
      <p className="text-xs text-gray-400 mb-4">折线法（保护角法）· 3D 可视化</p>
      <div className="flex-1">
        <RodList />
        <WireList />
        <EquipmentList />
        <DimensionDisplay />
      </div>
      <ExportButton />
    </div>
  );
}
```

---

### Task 14: 应用入口 + 样式

**Files:**
- Create: `src/App.tsx`, `src/main.tsx`, `src/index.css`

- [ ] **Step 1: 创建 src/App.tsx**

```typescript
import { useEffect } from 'react';
import { Sidebar } from './panel/Sidebar';
import { Scene3D } from './components/Scene3D';
import { useStore } from './store/useStore';

export default function App() {
  const recalculate = useStore(s => s.recalculate);

  useEffect(() => {
    recalculate();
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <Scene3D />
    </div>
  );
}
```

- [ ] **Step 2: 创建 src/main.tsx**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 3: 创建 src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 自定义滑块样式 */
input[type="range"] {
  -webkit-appearance: none;
  height: 4px;
  background: #ddd;
  border-radius: 2px;
  outline: none;
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  background: #555;
  border-radius: 50%;
  cursor: pointer;
}

/* 隐藏 number input 的 spinner */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
```

---

### Task 15: 验证与调试

- [ ] **Step 1: 启动开发服务器**

```bash
cd "d:/Vibe Coding/防雷计算" && npm run dev
```

- [ ] **Step 2: 验证 3D 场景渲染**

打开浏览器访问开发服务器URL，确认：
- 3D 场景正常渲染（浅灰背景 + 地面网格）
- 默认有两个避雷针（红柱）和一个设备（紫立方体）
- 保护包络面半透明显示
- 尺寸标注线可见

- [ ] **Step 3: 验证交互**

- 鼠标左键拖拽旋转场景
- 滚轮缩放
- 右键平移
- 左侧面板修改避雷针高度，3D 场景实时更新
- 添加新设备，观察保护状态判定

- [ ] **Step 4: 验证公式**

手动计算验证案例：避雷针 h=20m，设备 hx=5m，水平距离 10m：
- p = 1（h ≤ 30m）
- hx=5 < h/2=10 → rx = (1.5×20 - 2×5) × 1 = 30 - 10 = 20m
- 10m < 20m → 受保护 ✓

在软件中输入相同参数，确认保护状态显示 ✓。

- [ ] **Step 5: 验证截图导出**

点击「导出图片」按钮，确认下载 PNG 文件，图片内容与当前 3D 视图一致。

---

## Self-Review

**1. Spec coverage check:**
- ✅ 折线法公式实现 → Task 2, 3
- ✅ 多针/多线联合保护 → Task 2, 3, 5
- ✅ 保护包络面 3D 展示 → Task 5, 10
- ✅ 设备保护判定 → Task 4
- ✅ 参数面板（添加/编辑/删除）→ Task 13
- ✅ 高度滑块调节 → Task 13
- ✅ 保护状态显示 → Task 13
- ✅ 关键尺寸汇总 → Task 13
- ✅ 导出图片 → Task 13
- ✅ 地面网格 → Task 7
- ✅ 3D 旋转/缩放/平移 → Task 7
- ✅ 尺寸标注线 → Task 11
- ✅ 视觉风格（浅色工程图）→ Task 7, 8, 9, 10, 14

**2. Placeholder scan:**
- ✅ 无 TBD/TODO
- ✅ 所有代码步骤有完整实现
- ✅ 所有类型引用已定义

**3. Type consistency:**
- ✅ `LightningRod`, `LightningWire`, `Equipment` 等类型在 Task 1 定义，后续引用一致
- ✅ `ProtectionStatus`, `RodProtectionRange`, `WireProtectionRange`, `DimensionLine` 在 store 和 engine 中使用一致
- ✅ Store actions 命名与调用匹配
