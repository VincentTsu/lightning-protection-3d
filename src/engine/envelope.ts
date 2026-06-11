import { LightningRod, LightningWire, EnvelopeGeometry } from '../types';
import { protectionRadius, jointHalfWidth, equivalentJointPair } from './rodCalc';
import { protectionWidth } from './wireCalc';

// ---------------------------------------------------------------------------
// Shared: tangent-based joint cross-section (used by both slice & envelope)
// ---------------------------------------------------------------------------

/**
 * Generate a single ring of vertices for the joint protection cross-section
 * at height `y`.  Uses proper geometric tangents from the ±bx reference
 * points to both protection circles.
 *
 * Returns `ringVerts` 3D points [x, y, z] forming a closed counter-clockwise
 * loop, or null if no joint protection exists at this height.
 */
export function generateJointRing(
  rodA: LightningRod,
  rodB: LightningRod,
  y: number,
  ringVerts: number,
): [number, number, number][] | null {
  const pair = equivalentJointPair(rodA, rodB);
  if (!pair) return null;
  const eqA = pair.rodA;
  const eqB = pair.rodB;
  const D = pair.D;
  const h0 = pair.h0;
  if (h0 <= 0 || y >= h0) return null;

  const rx = protectionRadius(pair.h, y);
  if (rx <= 0) return null;
  const bx = jointHalfWidth(pair.h, pair.D, y, pair.p);

  const dx = eqB.x - eqA.x, dz = eqB.y - eqA.y;
  const ux = dx / D, uz = dz / D;
  const nx = -uz, nz = ux;
  const baseAngle = Math.atan2(uz, ux);

  const mx = (eqA.x + eqB.x) / 2, mz = (eqA.y + eqB.y) / 2;
  const pLx = mx - bx * nx, pLz = mz - bx * nz;
  const pRx = mx + bx * nx, pRz = mz + bx * nz;

  // If ±bx points fall inside the circles, the tangents don't exist.
  // In that case the two circles heavily overlap → use the standard
  // external tangents at distance rx from centreline (classic stadium).
  let tAL = tangentsFromPoint(pLx, pLz, eqA.x, eqA.y, rx);
  let tBL = tangentsFromPoint(pLx, pLz, eqB.x, eqB.y, rx);
  let tAR = tangentsFromPoint(pRx, pRz, eqA.x, eqA.y, rx);
  let tBR = tangentsFromPoint(pRx, pRz, eqB.x, eqB.y, rx);

  if (!tAL || !tBL || !tAR || !tBR) {
    // Retry with reference points at distance rx (circles' outermost extent)
    const Lx = mx - rx * nx, Lz = mz - rx * nz;
    const Rx = mx + rx * nx, Rz = mz + rx * nz;
    tAL = tangentsFromPoint(Lx, Lz, eqA.x, eqA.y, rx);
    tBL = tangentsFromPoint(Lx, Lz, eqB.x, eqB.y, rx);
    tAR = tangentsFromPoint(Rx, Rz, eqA.x, eqA.y, rx);
    tBR = tangentsFromPoint(Rx, Rz, eqB.x, eqB.y, rx);
  }

  if (!tAL || !tBL || !tAR || !tBR) {
    // Last resort: two separate circles
    return arcLengthSampleRing(eqA, eqB, rx, y, ux, uz, nx, nz, baseAngle, ringVerts, true);
  }

  const pick = (pts: [number, number][], ox: number, oz: number) => {
    const d0 = (pts[0][0]-ox)**2+(pts[0][1]-oz)**2;
    const d1 = (pts[1][0]-ox)**2+(pts[1][1]-oz)**2;
    return d0 > d1 ? pts[0] : pts[1];
  };

  const TA_L = pick(tAL, eqB.x, eqB.y);
  const TB_L = pick(tBL, eqA.x, eqA.y);
  const TA_R = pick(tAR, eqB.x, eqB.y);
  const TB_R = pick(tBR, eqA.x, eqA.y);

  // --- 6 segments forming the closed ring ---
  // 1) Arc A: TA_R → TA_L through far side
  const aAR = Math.atan2(TA_R[1] - eqA.y, TA_R[0] - eqA.x);
  const aAL = Math.atan2(TA_L[1] - eqA.y, TA_L[0] - eqA.x);
  const { from: afA, to: atA } = arcThroughFar(aAR, aAL, baseAngle + Math.PI);

  // 2) Tangent: TA_L → P_L
  // 3) Tangent: P_L → TB_L
  // 4) Arc B: TB_L → TB_R through far side
  const aBL = Math.atan2(TB_L[1] - eqB.y, TB_L[0] - eqB.x);
  const aBR = Math.atan2(TB_R[1] - eqB.y, TB_R[0] - eqB.x);
  const { from: afB, to: atB } = arcThroughFar(aBL, aBR, baseAngle);

  // 5) Tangent: TB_R → P_R
  // 6) Tangent: P_R → TA_R

  // --- Compute segment lengths ---
  const segLen = [
    rx * Math.abs(atA - afA),                     // arc A
    Math.hypot(TA_L[0]-pLx, TA_L[1]-pLz),         // TA_L → P_L
    Math.hypot(pLx-TB_L[0], pLz-TB_L[1]),         // P_L → TB_L
    rx * Math.abs(atB - afB),                     // arc B
    Math.hypot(TB_R[0]-pRx, TB_R[1]-pRz),         // TB_R → P_R
    Math.hypot(pRx-TA_R[0], pRz-TA_R[1]),         // P_R → TA_R
  ];
  const totalLen = segLen.reduce((a,b)=>a+b, 0);

  // --- Point-at-distance helpers ---
  const pointOnArc = (cx: number, cz: number, r: number, a0: number, da: number, dist: number) => {
    const frac = da === 0 ? 0 : dist / (r * Math.abs(da));
    const a = a0 + da * Math.min(1, frac);
    return [cx + r * Math.cos(a), cz + r * Math.sin(a)] as [number, number];
  };
  const pointOnSeg = (x0: number, z0: number, x1: number, z1: number, len: number, dist: number) => {
    const t = len === 0 ? 0 : Math.min(1, dist / len);
    return [x0 + (x1-x0)*t, z0 + (z1-z0)*t] as [number, number];
  };

  // --- Sample ringVerts points uniformly along the perimeter (closed) ---
  const ring: [number, number, number][] = [];
  for (let i = 0; i < ringVerts; i++) {
    const d = (totalLen * i) / (ringVerts - 1);
    let acc = 0;
    let px: number, pz: number;

    // Segment 0: arc A
    if (d < acc + segLen[0]) {
      [px, pz] = pointOnArc(eqA.x, eqA.y, rx, afA, atA - afA, d - acc);
    } else if (d < (acc += segLen[0]) + segLen[1]) {
      [px, pz] = pointOnSeg(TA_L[0], TA_L[1], pLx, pLz, segLen[1], d - acc);
    } else if (d < (acc += segLen[1]) + segLen[2]) {
      [px, pz] = pointOnSeg(pLx, pLz, TB_L[0], TB_L[1], segLen[2], d - acc);
    } else if (d < (acc += segLen[2]) + segLen[3]) {
      [px, pz] = pointOnArc(eqB.x, eqB.y, rx, afB, atB - afB, d - acc);
    } else if (d < (acc += segLen[3]) + segLen[4]) {
      [px, pz] = pointOnSeg(TB_R[0], TB_R[1], pRx, pRz, segLen[4], d - acc);
    } else {
      const d2 = d - (acc + segLen[4]);
      [px, pz] = pointOnSeg(pRx, pRz, TA_R[0], TA_R[1], segLen[5], Math.min(d2, segLen[5]));
    }

    ring.push([px, y, pz]);
  }

  return ring;
}

// ---- helpers ----

function tangentsFromPoint(
  px: number, pz: number, cx: number, cz: number, r: number,
): [number, number][] | null {
  const dx = cx - px, dz = cz - pz;
  const dSq = dx * dx + dz * dz;
  if (dSq <= r * r) return null;
  const d = Math.sqrt(dSq);
  const nx = dx / d, nz = dz / d; // unit P→C
  const disc = Math.sqrt(dSq - r * r);
  const rSqOverD = (r * r) / d;
  // Tangent point = C + (r²/d²)*(P-C) ± (r*disc/d²)*Rot90(P-C)
  // = C - (r²/d)*n ± (r*disc/d)*n_perp
  const rx = -nz, rz = nx; // rotate 90° CCW
  return [
    [cx - rSqOverD * nx + (r * disc / d) * rx,
     cz - rSqOverD * nz + (r * disc / d) * rz],
    [cx - rSqOverD * nx - (r * disc / d) * rx,
     cz - rSqOverD * nz - (r * disc / d) * rz],
  ];
}

/** Given two angles on a circle, find the CCW arc that passes through `farDir` */
function arcThroughFar(a1: number, a2: number, farDir: number) {
  const norm = (a: number) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const lo = Math.min(norm(a1), norm(a2));
  const hi = Math.max(norm(a1), norm(a2));
  const far = norm(farDir);

  // Two possible CCW arcs: [lo, hi] and [hi, lo+2π]
  // Check which one contains far
  if (lo <= far && far <= hi) {
    return { from: lo, to: hi };
  }
  return { from: hi, to: lo + 2 * Math.PI };
}

/** Simple fallback: two separate circles with arc-length sampling */
function arcLengthSampleRing(
  _rodA: LightningRod, _rodB: LightningRod,
  rx: number, y: number,
  ux: number, uz: number, nx: number, nz: number,
  baseAngle: number, ringVerts: number,
  _twoCircles: boolean,
): [number, number, number][] {
  const ring: [number, number, number][] = [];
  for (let i = 0; i < ringVerts; i++) {
    const a = (2 * Math.PI * i) / ringVerts;
    // Just draw full circles around both rods (they don't connect)
    if (_twoCircles) {
      // Alternate between the two circles to avoid seams
      const half = Math.floor(ringVerts / 2);
      if (i < half) {
        const aa = (2 * Math.PI * i) / half;
        ring.push([_rodA.x + rx * Math.cos(aa), y, _rodA.y + rx * Math.sin(aa)]);
      } else {
        const aa = (2 * Math.PI * (i - half)) / (ringVerts - half);
        ring.push([_rodB.x + rx * Math.cos(aa), y, _rodB.y + rx * Math.sin(aa)]);
      }
    } else {
      ring.push([_rodA.x + rx * Math.cos(a), y, _rodA.y + rx * Math.sin(a)]);
    }
  }
  return ring;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute a unit normal for triangle (a,b,c), following right-hand winding.
 * Vertices are [x,y,z] plain arrays; Y is up.
 */
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

/**
 * Pack a geometry definition into the EnvelopeGeometry shape expected by the
 * Three.js layer: interleaved positions + index list + per-vertex normals.
 */
function packGeometry(
  vertices: [number, number, number][],
  indices: number[],
): EnvelopeGeometry {
  const positions = new Float32Array(vertices.length * 3);
  const normalsArr = new Float32Array(vertices.length * 3);

  // Accumulate face normals into per-vertex sums, then normalise.
  const accumulated: [number, number, number][] = vertices.map(() => [0, 0, 0]);

  for (let i = 0; i < indices.length; i += 3) {
    const ai = indices[i];
    const bi = indices[i + 1];
    const ci = indices[i + 2];
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
    const nnx = len > 0 ? nx / len : 0;
    const nny = len > 0 ? ny / len : 1;
    const nnz = len > 0 ? nz / len : 0;
    const j = i * 3;
    positions[j] = vertices[i][0];
    positions[j + 1] = vertices[i][1];
    positions[j + 2] = vertices[i][2];
    normalsArr[j] = nnx;
    normalsArr[j + 1] = nny;
    normalsArr[j + 2] = nnz;
  }

  return { positions, indices, normals: normalsArr };
}

// ---------------------------------------------------------------------------
// Single-rod cone-frustum envelope
// ---------------------------------------------------------------------------

/**
 * Generate the 3D protection envelope for a single lightning rod.
 *
 * The shape is a cone (or cone frustum) whose cross-section radius at height
 * `hz` equals `protectionRadius(rod.height, hz)`.  We sample `heightSamples`
 * levels from y=0 (ground) to y=rod.height (tip).  At each level we place a
 * circle of `segments` points, then stitch adjacent circles with triangles.
 *
 * The envelope is watertight: side wall + bottom cap (y=0 disc) + top cap
 * (the tip is a single degenerate point).
 */
export function generateRodEnvelope(
  rod: LightningRod,
  segments: number = 32,
  heightSamples: number = 20,
): EnvelopeGeometry {
  const vertices: [number, number, number][] = [];
  const indices: number[] = [];

  const ringStart: number[] = [];

  for (let s = 0; s <= heightSamples; s++) {
    const t = s / heightSamples;
    const hz = t * rod.height;
    const r = protectionRadius(rod.height, hz);

    ringStart.push(vertices.length);

    for (let i = 0; i < segments; i++) {
      const angle = (2 * Math.PI * i) / segments;
      vertices.push([
        rod.x + r * Math.cos(angle),
        hz,
        rod.y + r * Math.sin(angle),
      ]);
    }
  }

  // --- side wall: stitch adjacent rings ---
  for (let s = 0; s < heightSamples; s++) {
    const base = ringStart[s];
    const top = ringStart[s + 1];

    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      // Two triangles per quad, winding outward (CCW viewed from outside):
      // The surface normal should point outward, so for Y-up we wind
      // counter-clockwise when looking from outside.
      indices.push(base + i, top + i, top + next);
      indices.push(base + i, top + next, base + next);
    }
  }

  // --- bottom cap ---
  const bottomCenter = vertices.length;
  vertices.push([rod.x, 0, rod.y]);
  const bottomRing = ringStart[0];
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    indices.push(bottomCenter, bottomRing + next, bottomRing + i);
  }

  // --- top cap (cone tip) ---
  // If the top ring has zero radius, it's already a point and we skip.
  // Otherwise add the tip vertex and fan out.
  const topRing = ringStart[heightSamples];
  const topR = protectionRadius(rod.height, rod.height); // should be 0
  if (topR < 1e-6) {
    // Degenerate tip — all top-ring vertices coincide; skip cap, they already
    // form a degenerate ring.
  } else {
    const tipCenter = vertices.length;
    vertices.push([rod.x, rod.height, rod.y]);
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      indices.push(tipCenter, topRing + i, topRing + next);
    }
  }

  return packGeometry(vertices, indices);
}

// ---------------------------------------------------------------------------
// Lightning wire envelope
// ---------------------------------------------------------------------------

/**
 * Generate the 3D protection envelope for a single lightning wire.
 *
 * At each height level we compute a protection half-width `b`.  The cross-
 * section is a horizontal line segment perpendicular to the wire direction.
 * Adjacent height levels are stitched into quadrilateral strips that form the
 * envelope surface.
 *
 * The result is a "tent" shape: wide at the ground, narrowing to a ridge line
 * at the wire height.
 */
export function generateWireEnvelope(
  wire: LightningWire,
  segments: number = 16,
  heightSamples: number = 20,
): EnvelopeGeometry {
  const vertices: [number, number, number][] = [];
  const indices: number[] = [];

  // Wire direction in XZ plane
  const wx = wire.x2 - wire.x1;
  const wy = wire.y2 - wire.y1;
  const wLen = Math.sqrt(wx * wx + wy * wy);
  if (wLen < 1e-9) {
    // Degenerate: treat as a single point
    return packGeometry([], []);
  }
  const ux = wx / wLen;
  const uy = wy / wLen;
  // Perpendicular direction (rotate 90° CCW in XZ: (-uy, ux) = left side)
  const px = -uy;
  const py = ux;

  // Sample `segments+1` points along the wire
  const ringStart: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const cx = wire.x1 + t * wx;
    const cz = wire.y1 + t * wy;

    ringStart.push(vertices.length);

    for (let s = 0; s <= heightSamples; s++) {
      const hz = (s / heightSamples) * wire.height;
      const b = protectionWidth(wire.height, hz);

      // Left vertex (-p) and right vertex (+p)
      vertices.push([cx - px * b, hz, cz - py * b]); // "left"
      vertices.push([cx + px * b, hz, cz + py * b]); // "right"
    }
  }

  // --- Stitch adjacent columns ---
  for (let i = 0; i < segments; i++) {
    const base = ringStart[i];
    const next = ringStart[i + 1];

    for (let s = 0; s < heightSamples; s++) {
      const bl = base + s * 2;          // current column, left
      const br = base + s * 2 + 1;      // current column, right
      const tl = next + s * 2;          // next column, left
      const tr = next + s * 2 + 1;      // next column, right

      // Two triangles for the side-facing quad (left side panel).
      // Winding for outward-facing normals (pointing left / -p)
      indices.push(bl, tl, br);
      indices.push(br, tl, tr);
    }

    // --- Top ridge cap ---
    // At heightSamples the left and right vertices are at the wire center
    // (since b=0 at hz=wire.height). We close the ridge between columns.
    const topL0 = base + heightSamples * 2;
    const topR0 = base + heightSamples * 2 + 1;
    const topL1 = next + heightSamples * 2;
    const topR1 = next + heightSamples * 2 + 1;

    // Ridge is degenerate (left==right) so this is a line; still fill for
    // completeness.
    indices.push(topL0, topR0, topR1);
    indices.push(topL0, topR1, topL1);
  }

  // --- Bottom cap (ground plane) ---
  // Fan from the "center line" of the wire on the ground
  const bottomCenterStart = vertices.length;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    vertices.push([wire.x1 + t * wx, 0, wire.y1 + t * wy]);
  }
  for (let i = 0; i < segments; i++) {
    const bc0 = bottomCenterStart + i;
    const bc1 = bottomCenterStart + i + 1;
    const bl0 = ringStart[i];           // bottom-left of column i
    const br0 = ringStart[i] + 1;
    const bl1 = ringStart[i + 1];
    const br1 = ringStart[i + 1] + 1;

    // Left bottom half-quad
    indices.push(bc0, bl0, bl1);
    indices.push(bc0, bl1, bc1);

    // Right bottom half-quad
    indices.push(bc0, bc1, br1);
    indices.push(bc0, br1, br0);
  }

  // --- End caps (vertical faces at wire start and end) ---
  // For the end cap, we fan from the center-line at each height.
  // Add a vertical center line at wire start
  const end0VertStart = vertices.length;
  for (let s = 0; s <= heightSamples; s++) {
    const hz = (s / heightSamples) * wire.height;
    vertices.push([wire.x1, hz, wire.y1]); // center point at this height
  }
  for (let s = 0; s < heightSamples; s++) {
    const c0 = end0VertStart + s;
    const c1 = end0VertStart + s + 1;
    const l0 = ringStart[0] + s * 2;       // left at this height
    const r0 = ringStart[0] + s * 2 + 1;   // right at this height
    const l1 = ringStart[0] + (s + 1) * 2;
    const r1 = ringStart[0] + (s + 1) * 2 + 1;

    // Left half
    indices.push(c0, l1, l0);
    indices.push(c0, c1, l1);
    // Right half
    indices.push(c0, r0, r1);
    indices.push(c0, r1, c1);
  }

  // End cap at wire end
  const end1VertStart = vertices.length;
  const endIndex = segments;
  for (let s = 0; s <= heightSamples; s++) {
    const hz = (s / heightSamples) * wire.height;
    vertices.push([wire.x2, hz, wire.y2]);
  }
  for (let s = 0; s < heightSamples; s++) {
    const c0 = end1VertStart + s;
    const c1 = end1VertStart + s + 1;
    const l0 = ringStart[endIndex] + s * 2;
    const r0 = ringStart[endIndex] + s * 2 + 1;
    const l1 = ringStart[endIndex] + (s + 1) * 2;
    const r1 = ringStart[endIndex] + (s + 1) * 2 + 1;

    indices.push(c0, l0, l1);
    indices.push(c0, l1, c1);
    indices.push(c0, r1, r0);
    indices.push(c0, c1, r1);
  }

  return packGeometry(vertices, indices);
}

// ---------------------------------------------------------------------------
// Wire end cap (half-cone)
// ---------------------------------------------------------------------------

/**
 * Generate a half-cone end cap for a wire end.
 *
 * `nx, ny` is the outward direction (in XZ plane) from the wire end.
 * This creates a surface that smoothly closes the wire envelope at one end,
 * forming a half-cone shape whose radius at each height is the protection
 * width.
 */
export function generateWireEndCap(
  x: number,
  y: number,
  wireHeight: number,
  nx: number,
  ny: number,
  segments: number = 16,
  heightSamples: number = 10,
): EnvelopeGeometry {
  const vertices: [number, number, number][] = [];
  const indices: number[] = [];

  // Normalize outward direction
  const len = Math.sqrt(nx * nx + ny * ny);
  const ux = len > 0 ? nx / len : 1;
  const uy = len > 0 ? ny / len : 0;

  // Perpendicular direction for the half-circle
  const px = -uy;
  const py = ux;

  // Generate vertices: rings of half-circles
  const ringStart: number[] = [];
  for (let s = 0; s <= heightSamples; s++) {
    const hz = (s / heightSamples) * wireHeight;
    const b = protectionWidth(wireHeight, hz);

    ringStart.push(vertices.length);

    // Half-circle from -90° to +90° around the outward direction
    for (let i = 0; i <= segments; i++) {
      const angle = Math.PI * (i / segments - 0.5); // -PI/2 to +PI/2
      const radialX = px * Math.cos(angle);
      const radialZ = py * Math.cos(angle);
      const axialOffset = ux * Math.sin(angle);
      const axialOffsetZ = uy * Math.sin(angle);

      vertices.push([
        x + radialX * b + axialOffset * b,
        hz,
        y + radialZ * b + axialOffsetZ * b,
      ]);
    }
  }

  // Stitch adjacent rings
  for (let s = 0; s < heightSamples; s++) {
    const base = ringStart[s];
    const top = ringStart[s + 1];
    for (let i = 0; i < segments; i++) {
      const b0 = base + i;
      const b1 = base + i + 1;
      const t0 = top + i;
      const t1 = top + i + 1;

      indices.push(b0, t0, t1);
      indices.push(b0, t1, b1);
    }
  }

  // Bottom cap (half-disc on the ground)
  const bottomCenter = vertices.length;
  vertices.push([x, 0, y]);
  const bottomRing = ringStart[0];
  for (let i = 0; i < segments; i++) {
    indices.push(bottomCenter, bottomRing + i + 1, bottomRing + i);
  }

  // Top cap (half-disc at the wire tip — degenerate if b=0)
  const topB = protectionWidth(wireHeight, wireHeight);
  let topCenter: number | null = null;
  if (topB > 1e-6) {
    topCenter = vertices.length;
    vertices.push([x, wireHeight, y]);
    const topRing = ringStart[heightSamples];
    for (let i = 0; i < segments; i++) {
      indices.push(topCenter, topRing + i, topRing + i + 1);
    }
  }

  // Back face (the flat face perpendicular to the outward direction)
  // The "back" is the vertical plane through the center line.
  const backStart = vertices.length;
  for (let s = 0; s <= heightSamples; s++) {
    const hz = (s / heightSamples) * wireHeight;
    vertices.push([x, hz, y]);
  }
  // The back edge vertices are the first vertex of each ring (at angle = -PI/2)
  for (let s = 0; s < heightSamples; s++) {
    const c0 = backStart + s;
    const c1 = backStart + s + 1;
    const p0 = ringStart[s];           // first vertex of ring (angle = -PI/2)
    const p1 = ringStart[s + 1];

    // The back face normal should point inward (opposite of the outward direction)
    indices.push(c0, p0, p1);
    indices.push(c0, p1, c1);

    // Also the symmetrical vertex at angle = +PI/2 (last vertex of ring)
    const q0 = ringStart[s] + segments;
    const q1 = ringStart[s + 1] + segments;
    indices.push(c0, q1, q0);
    indices.push(c0, c1, q1);
  }

  // Bottom triangle on the back face (connect center to back edge on ground)
  indices.push(bottomCenter, bottomRing, bottomRing + segments);

  // Top triangle on the back face (if not degenerate)
  if (topB > 1e-6 && topCenter !== null) {
    const topRingIdx = ringStart[heightSamples];
    indices.push(topCenter, topRingIdx + segments, topRingIdx);
  }

  return packGeometry(vertices, indices);
}
