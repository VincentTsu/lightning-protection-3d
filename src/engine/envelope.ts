import { LightningRod, LightningWire, EnvelopeGeometry } from '../types';
import { protectionRadius } from './rodCalc';
import { protectionWidth } from './wireCalc';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function triangleNormal(
  a: [number, number, number],
  b: [number, number, number],
  c: [number, number, number],
): [number, number, number] {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (len < 1e-12) return [0, 1, 0];
  return [nx / len, ny / len, nz / len];
}

function packGeometry(
  vertices: [number, number, number][],
  indices: number[],
): EnvelopeGeometry {
  const positions = new Float32Array(vertices.length * 3);
  const normalsArr = new Float32Array(vertices.length * 3);
  const accumulated: [number, number, number][] = vertices.map(() => [0, 0, 0]);

  for (let i = 0; i < indices.length; i += 3) {
    const ai = indices[i], bi = indices[i + 1], ci = indices[i + 2];
    const fn = triangleNormal(vertices[ai], vertices[bi], vertices[ci]);
    for (const vi of [ai, bi, ci]) {
      accumulated[vi][0] += fn[0];
      accumulated[vi][1] += fn[1];
      accumulated[vi][2] += fn[2];
    }
  }

  for (let i = 0; i < vertices.length; i++) {
    const [nx, ny, nz] = accumulated[i];
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    const j = i * 3;
    positions[j] = vertices[i][0];
    positions[j + 1] = vertices[i][1];
    positions[j + 2] = vertices[i][2];
    normalsArr[j] = len > 0 ? nx / len : 0;
    normalsArr[j + 1] = len > 0 ? ny / len : 1;
    normalsArr[j + 2] = len > 0 ? nz / len : 0;
  }

  return { positions, indices, normals: normalsArr };
}

// ---------------------------------------------------------------------------
// Single-rod cone
// ---------------------------------------------------------------------------

export function generateRodEnvelope(
  rod: LightningRod,
  segments: number = 32,
  heightSamples: number = 20,
): EnvelopeGeometry {
  const vertices: [number, number, number][] = [];
  const indices: number[] = [];
  const ringStart: number[] = [];

  for (let s = 0; s <= heightSamples; s++) {
    const hz = (s / heightSamples) * rod.height;
    const r = protectionRadius(rod.height, hz);
    ringStart.push(vertices.length);
    for (let i = 0; i < segments; i++) {
      const angle = (2 * Math.PI * i) / segments;
      vertices.push([rod.x + r * Math.cos(angle), hz, rod.y + r * Math.sin(angle)]);
    }
  }

  for (let s = 0; s < heightSamples; s++) {
    const base = ringStart[s], top = ringStart[s + 1];
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      indices.push(base + i, top + i, top + next);
      indices.push(base + i, top + next, base + next);
    }
  }

  // Bottom cap
  const bc = vertices.length; vertices.push([rod.x, 0, rod.y]);
  const br = ringStart[0];
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    indices.push(bc, br + next, br + i);
  }

  // Top cap
  const tr = ringStart[heightSamples];
  const topR = protectionRadius(rod.height, rod.height);
  if (topR > 1e-6) {
    const tc = vertices.length; vertices.push([rod.x, rod.height, rod.y]);
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      indices.push(tc, tr + i, tr + next);
    }
  }

  return packGeometry(vertices, indices);
}

// ---------------------------------------------------------------------------
// Lightning wire tent
// ---------------------------------------------------------------------------

export function generateWireEnvelope(
  wire: LightningWire,
  segments: number = 16,
  heightSamples: number = 20,
): EnvelopeGeometry {
  const vertices: [number, number, number][] = [];
  const indices: number[] = [];
  const wx = wire.x2 - wire.x1, wy = wire.y2 - wire.y1;
  const wLen = Math.sqrt(wx * wx + wy * wy);
  if (wLen < 1e-9) return packGeometry([], []);
  const ux = wx / wLen, uy = wy / wLen;
  const px = -uy, py = ux;
  const ringStart: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const cx = wire.x1 + t * wx, cz = wire.y1 + t * wy;
    ringStart.push(vertices.length);
    for (let s = 0; s <= heightSamples; s++) {
      const hz = (s / heightSamples) * wire.height;
      const b = protectionWidth(wire.height, hz);
      vertices.push([cx - px * b, hz, cz - py * b]);
      vertices.push([cx + px * b, hz, cz + py * b]);
    }
  }

  for (let i = 0; i < segments; i++) {
    const base = ringStart[i], next = ringStart[i + 1];
    for (let s = 0; s < heightSamples; s++) {
      const bl = base + s * 2, br = base + s * 2 + 1;
      const nl = next + s * 2, nr = next + s * 2 + 1;
      indices.push(bl, nl, br);
      indices.push(br, nl, nr);
    }
    const tl0 = base + heightSamples * 2, tr0 = tl0 + 1;
    const tl1 = next + heightSamples * 2, tr1 = tl1 + 1;
    indices.push(tl0, tr0, tr1);
    indices.push(tl0, tr1, tl1);
  }

  // Bottom cap
  const bcs = vertices.length;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    vertices.push([wire.x1 + t * wx, 0, wire.y1 + t * wy]);
  }
  for (let i = 0; i < segments; i++) {
    const bc0 = bcs + i, bc1 = bcs + i + 1;
    const bl0 = ringStart[i], br0 = ringStart[i] + 1;
    const bl1 = ringStart[i + 1], br1 = ringStart[i + 1] + 1;
    indices.push(bc0, bl0, bl1); indices.push(bc0, bl1, bc1);
    indices.push(bc0, bc1, br1); indices.push(bc0, br1, br0);
  }

  return packGeometry(vertices, indices);
}
