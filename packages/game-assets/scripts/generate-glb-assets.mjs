import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, '../../../apps/web/public/assets/models');

/**
 * Shared 20-color named palette (must match ZOO_PALETTE in src/manifest.ts)
 */
export const ZOO_PALETTE = {
  leafCanopy: '#3a7d44',
  meadowGrass: '#68a357',
  mossShadow: '#254d32',
  bambooStalk: '#8fc93a',
  stonePath: '#d6cfc2',
  graniteSlate: '#7d8491',
  charcoalFur: '#22272e',
  snowCream: '#f7f5fb',
  warmTimber: '#8c5a3c',
  cedarBark: '#5c3a21',
  terracottaRoof: '#c85a32',
  sunflowerGold: '#f4b942',
  lanternAmber: '#ff9f1c',
  pondTeal: '#2ec4b6',
  deepWater: '#1a659e',
  blossomPink: '#ff8fa3',
  otterCinnamon: '#9c6644',
  otterBuff: '#e0b084',
  skyMist: '#cfe8ef',
  coralAccent: '#e76f51'
};

/**
 * Converts a 6-digit hex string from ZOO_PALETTE into a glTF 2.0 RGBA baseColorFactor tuple.
 * @param {keyof typeof ZOO_PALETTE} paletteKey
 * @returns {[number, number, number, number]}
 */
function paletteRgba(paletteKey) {
  const hex = ZOO_PALETTE[paletteKey].replace('#', '');
  const r = Number.parseInt(hex.slice(0, 2), 16) / 255;
  const g = Number.parseInt(hex.slice(2, 4), 16) / 255;
  const b = Number.parseInt(hex.slice(4, 6), 16) / 255;
  return [Number(r.toFixed(4)), Number(g.toFixed(4)), Number(b.toFixed(4)), 1.0];
}

/**
 * Creates a spec-compliant glTF 2.0 binary (.glb) buffer with flat-shaded low-poly box/prism
 * primitives and palette-only materials so GLTFLoader / useGLTF can load real .glb assets.
 * @param {{ name: string; parts: Array<{ size: number[]; offset: number[]; paletteKey: keyof typeof ZOO_PALETTE; metallic?: number; roughness?: number }> }} definition
 */
function buildStylizedGlb({ name, parts }) {
  /** @type {number[]} */
  const positions = [];
  /** @type {number[]} */
  const normals = [];
  /** @type {number[]} */
  const indices = [];
  /** @type {any[]} */
  const materials = [];
  /** @type {Array<{ startIndex: number; indexCount: number; materialIndex: number }>} */
  const meshPrimitives = [];

  parts.forEach((part, partIdx) => {
    const sx = part.size[0] ?? 1;
    const sy = part.size[1] ?? 1;
    const sz = part.size[2] ?? 1;
    const ox = part.offset[0] ?? 0;
    const oy = part.offset[1] ?? 0;
    const oz = part.offset[2] ?? 0;
    const hx = sx / 2;
    const hy = sy / 2;
    const hz = sz / 2;

    const baseVertex = positions.length / 3;

    // 6 flat-shaded faces of a low-poly box (24 vertices with hard per-face normals, 36 indices)
    const faces = [
      // Front (+Z)
      {
        n: [0, 0, 1],
        v: [
          [-hx, -hy, hz],
          [hx, -hy, hz],
          [hx, hy, hz],
          [-hx, hy, hz]
        ]
      },
      // Back (-Z)
      {
        n: [0, 0, -1],
        v: [
          [hx, -hy, -hz],
          [-hx, -hy, -hz],
          [-hx, hy, -hz],
          [hx, hy, -hz]
        ]
      },
      // Top (+Y)
      {
        n: [0, 1, 0],
        v: [
          [-hx, hy, hz],
          [hx, hy, hz],
          [hx, hy, -hz],
          [-hx, hy, -hz]
        ]
      },
      // Bottom (-Y)
      {
        n: [0, -1, 0],
        v: [
          [-hx, -hy, -hz],
          [hx, -hy, -hz],
          [hx, -hy, hz],
          [-hx, -hy, hz]
        ]
      },
      // Right (+X)
      {
        n: [1, 0, 0],
        v: [
          [hx, -hy, hz],
          [hx, -hy, -hz],
          [hx, hy, -hz],
          [hx, hy, hz]
        ]
      },
      // Left (-X)
      {
        n: [-1, 0, 0],
        v: [
          [-hx, -hy, -hz],
          [-hx, -hy, hz],
          [-hx, hy, hz],
          [-hx, hy, -hz]
        ]
      }
    ];

    const startIndex = indices.length;
    faces.forEach((face, fIdx) => {
      const v0 = baseVertex + fIdx * 4;
      for (const vertex of face.v) {
        const vx = vertex[0] ?? 0;
        const vy = vertex[1] ?? 0;
        const vz = vertex[2] ?? 0;
        positions.push(vx + ox, vy + oy, vz + oz);
        normals.push(face.n[0] ?? 0, face.n[1] ?? 0, face.n[2] ?? 0);
      }
      indices.push(v0, v0 + 1, v0 + 2, v0, v0 + 2, v0 + 3);
    });

    materials.push({
      name: `${name}_${part.paletteKey}_${partIdx}`,
      pbrMetallicRoughness: {
        baseColorFactor: paletteRgba(part.paletteKey),
        metallicFactor: part.metallic ?? 0.02,
        roughnessFactor: part.roughness ?? 0.85
      }
    });

    meshPrimitives.push({
      startIndex,
      indexCount: 36,
      materialIndex: partIdx
    });
  });

  const posArray = new Float32Array(positions);
  const normArray = new Float32Array(normals);
  const idxArray = new Uint16Array(indices);

  // Compute min/max for POSITION accessor (required by glTF 2.0 spec)
  const minPos = /** @type {[number, number, number]} */ ([Infinity, Infinity, Infinity]);
  const maxPos = /** @type {[number, number, number]} */ ([-Infinity, -Infinity, -Infinity]);
  for (let i = 0; i < positions.length; i += 3) {
    const px = positions[i] ?? 0;
    const py = positions[i + 1] ?? 0;
    const pz = positions[i + 2] ?? 0;
    minPos[0] = Math.min(minPos[0], px);
    minPos[1] = Math.min(minPos[1], py);
    minPos[2] = Math.min(minPos[2], pz);
    maxPos[0] = Math.max(maxPos[0], px);
    maxPos[1] = Math.max(maxPos[1], py);
    maxPos[2] = Math.max(maxPos[2], pz);
  }

  const posByteLength = posArray.byteLength;
  const normByteLength = normArray.byteLength;
  const idxByteLength = idxArray.byteLength;
  const rawBinLength = posByteLength + normByteLength + idxByteLength;
  const paddedBinLength = Math.ceil(rawBinLength / 4) * 4;

  const binBuffer = Buffer.alloc(paddedBinLength);
  Buffer.from(posArray.buffer).copy(binBuffer, 0);
  Buffer.from(normArray.buffer).copy(binBuffer, posByteLength);
  Buffer.from(idxArray.buffer).copy(binBuffer, posByteLength + normByteLength);

  const accessors = [
    {
      bufferView: 0,
      byteOffset: 0,
      componentType: 5126, // FLOAT
      count: positions.length / 3,
      type: 'VEC3',
      min: minPos.map((n) => Number(n.toFixed(4))),
      max: maxPos.map((n) => Number(n.toFixed(4)))
    },
    {
      bufferView: 1,
      byteOffset: 0,
      componentType: 5126, // FLOAT
      count: normals.length / 3,
      type: 'VEC3'
    }
  ];

  const primitives = meshPrimitives.map((prim) => {
    const accIdx = accessors.length;
    accessors.push({
      bufferView: 2,
      byteOffset: prim.startIndex * 2,
      componentType: 5123, // UNSIGNED_SHORT
      count: prim.indexCount,
      type: 'SCALAR'
    });
    return {
      attributes: {
        POSITION: 0,
        NORMAL: 1
      },
      indices: accIdx,
      material: prim.materialIndex,
      mode: 4 // TRIANGLES
    };
  });

  const gltfJson = {
    asset: {
      version: '2.0',
      generator: '@online-zoo/game-assets deterministic flat-shaded GLB builder'
    },
    scene: 0,
    scenes: [{ name, nodes: [0] }],
    nodes: [{ name, mesh: 0 }],
    meshes: [{ name: `${name}_mesh`, primitives }],
    materials,
    bufferViews: [
      {
        buffer: 0,
        byteOffset: 0,
        byteLength: posByteLength,
        target: 34962 // ARRAY_BUFFER
      },
      {
        buffer: 0,
        byteOffset: posByteLength,
        byteLength: normByteLength,
        target: 34962 // ARRAY_BUFFER
      },
      {
        buffer: 0,
        byteOffset: posByteLength + normByteLength,
        byteLength: idxByteLength,
        target: 34963 // ELEMENT_ARRAY_BUFFER
      }
    ],
    accessors,
    buffers: [{ byteLength: paddedBinLength }]
  };

  const jsonString = JSON.stringify(gltfJson);
  const rawJsonByteLength = Buffer.byteLength(jsonString, 'utf8');
  const paddedJsonByteLength = Math.ceil(rawJsonByteLength / 4) * 4;
  const jsonBuffer = Buffer.alloc(paddedJsonByteLength, 0x20); // Pad with spaces
  jsonBuffer.write(jsonString, 0, 'utf8');

  const totalLength = 12 + 8 + paddedJsonByteLength + 8 + paddedBinLength;
  const glb = Buffer.alloc(totalLength);

  // Header
  glb.writeUInt32LE(0x46546c67, 0); // 'glTF'
  glb.writeUInt32LE(2, 4); // version 2
  glb.writeUInt32LE(totalLength, 8);

  // JSON chunk
  glb.writeUInt32LE(paddedJsonByteLength, 12);
  glb.writeUInt32LE(0x4e4f534a, 16); // 'JSON'
  jsonBuffer.copy(glb, 20);

  // BIN chunk
  const binChunkOffset = 20 + paddedJsonByteLength;
  glb.writeUInt32LE(paddedBinLength, binChunkOffset);
  glb.writeUInt32LE(0x004e4942, binChunkOffset + 4); // 'BIN\0'
  binBuffer.copy(glb, binChunkOffset + 8);

  return glb;
}

/** @type {Array<{ filename: string; name: string; parts: Array<{ size: number[]; offset: number[]; paletteKey: keyof typeof ZOO_PALETTE; metallic?: number; roughness?: number }> }>} */
const ASSET_DEFINITIONS = [
  {
    filename: 'avatar-explorer.glb',
    name: 'avatar-explorer',
    parts: [
      { size: [0.55, 0.7, 0.35], offset: [0, 0.85, 0], paletteKey: 'leafCanopy' },
      { size: [0.46, 0.46, 0.46], offset: [0, 1.48, 0], paletteKey: 'otterBuff' },
      { size: [0.54, 0.18, 0.54], offset: [0, 1.75, 0], paletteKey: 'snowCream' },
      { size: [0.16, 0.16, 0.12], offset: [-0.22, 1.88, 0], paletteKey: 'charcoalFur' },
      { size: [0.16, 0.16, 0.12], offset: [0.22, 1.88, 0], paletteKey: 'charcoalFur' },
      { size: [0.42, 0.48, 0.22], offset: [0, 0.9, -0.26], paletteKey: 'warmTimber' }
    ]
  },
  {
    filename: 'prop-bamboo-cluster.glb',
    name: 'prop-bamboo-cluster',
    parts: [
      { size: [0.18, 6.5, 0.18], offset: [0, 3.25, 0], paletteKey: 'bambooStalk' },
      { size: [0.16, 5.8, 0.16], offset: [0.35, 2.9, 0.2], paletteKey: 'meadowGrass' },
      { size: [0.15, 6.2, 0.15], offset: [-0.3, 3.1, -0.25], paletteKey: 'leafCanopy' },
      { size: [1.4, 1.2, 1.4], offset: [0, 6.0, 0], paletteKey: 'bambooStalk' }
    ]
  },
  {
    filename: 'prop-stone-lantern.glb',
    name: 'prop-stone-lantern',
    parts: [
      { size: [0.9, 0.25, 0.9], offset: [0, 0.125, 0], paletteKey: 'graniteSlate' },
      { size: [0.38, 1.1, 0.38], offset: [0, 0.8, 0], paletteKey: 'stonePath' },
      { size: [0.65, 0.5, 0.65], offset: [0, 1.6, 0], paletteKey: 'lanternAmber' },
      { size: [1.1, 0.28, 1.1], offset: [0, 2.0, 0], paletteKey: 'graniteSlate' }
    ]
  },
  {
    filename: 'prop-habitat-plaque.glb',
    name: 'prop-habitat-plaque',
    parts: [
      { size: [0.16, 1.2, 0.16], offset: [-0.55, 0.6, 0], paletteKey: 'cedarBark' },
      { size: [0.16, 1.2, 0.16], offset: [0.55, 0.6, 0], paletteKey: 'cedarBark' },
      { size: [1.4, 0.85, 0.14], offset: [0, 1.25, 0], paletteKey: 'otterBuff' },
      { size: [1.56, 0.14, 0.28], offset: [0, 1.72, 0], paletteKey: 'leafCanopy' }
    ]
  },
  {
    filename: 'prop-wind-chime.glb',
    name: 'prop-wind-chime',
    parts: [
      { size: [0.22, 2.6, 0.22], offset: [-0.8, 1.3, 0], paletteKey: 'cedarBark' },
      { size: [0.22, 2.6, 0.22], offset: [0.8, 1.3, 0], paletteKey: 'cedarBark' },
      { size: [2.1, 0.22, 0.45], offset: [0, 2.55, 0], paletteKey: 'leafCanopy' },
      { size: [0.1, 0.75, 0.1], offset: [-0.25, 2.0, 0], paletteKey: 'sunflowerGold' },
      { size: [0.1, 0.85, 0.1], offset: [0, 1.95, 0], paletteKey: 'lanternAmber' },
      { size: [0.1, 0.7, 0.1], offset: [0.25, 2.02, 0], paletteKey: 'sunflowerGold' }
    ]
  },
  {
    filename: 'prop-wooden-bench.glb',
    name: 'prop-wooden-bench',
    parts: [
      { size: [1.8, 0.12, 0.65], offset: [0, 0.5, 0], paletteKey: 'warmTimber' },
      { size: [1.8, 0.55, 0.12], offset: [0, 0.84, -0.26], paletteKey: 'cedarBark' },
      { size: [0.16, 0.5, 0.55], offset: [-0.75, 0.25, 0], paletteKey: 'graniteSlate' },
      { size: [0.16, 0.5, 0.55], offset: [0.75, 0.25, 0], paletteKey: 'graniteSlate' }
    ]
  },
  {
    filename: 'animal-panda.glb',
    name: 'animal-panda',
    parts: [
      // Low-poly white torso & black shoulder saddle
      { size: [0.76, 0.58, 0.88], offset: [0, 0.48, 0], paletteKey: 'snowCream' },
      { size: [0.8, 0.44, 0.42], offset: [0, 0.56, 0.16], paletteKey: 'charcoalFur' },
      // Head, ears, eye patches, snout
      { size: [0.54, 0.48, 0.5], offset: [0, 0.86, 0.36], paletteKey: 'snowCream' },
      { size: [0.16, 0.16, 0.12], offset: [-0.22, 1.12, 0.32], paletteKey: 'charcoalFur' },
      { size: [0.16, 0.16, 0.12], offset: [0.22, 1.12, 0.32], paletteKey: 'charcoalFur' },
      { size: [0.13, 0.13, 0.06], offset: [-0.12, 0.9, 0.6], paletteKey: 'charcoalFur' },
      { size: [0.13, 0.13, 0.06], offset: [0.12, 0.9, 0.6], paletteKey: 'charcoalFur' },
      { size: [0.18, 0.14, 0.12], offset: [0, 0.8, 0.62], paletteKey: 'stonePath' },
      // 4 Charcoal limbs
      { size: [0.22, 0.36, 0.22], offset: [-0.26, 0.18, 0.24], paletteKey: 'charcoalFur' },
      { size: [0.22, 0.36, 0.22], offset: [0.26, 0.18, 0.24], paletteKey: 'charcoalFur' },
      { size: [0.22, 0.36, 0.22], offset: [-0.26, 0.18, -0.24], paletteKey: 'charcoalFur' },
      { size: [0.22, 0.36, 0.22], offset: [0.26, 0.18, -0.24], paletteKey: 'charcoalFur' }
    ]
  },
  {
    filename: 'animal-penguin.glb',
    name: 'animal-penguin',
    parts: [
      // Dorsal slate body & snow-cream belly
      { size: [0.42, 0.62, 0.38], offset: [0, 0.42, 0], paletteKey: 'charcoalFur' },
      { size: [0.32, 0.52, 0.12], offset: [0, 0.4, 0.16], paletteKey: 'snowCream' },
      // Head, amber beak, eyes
      { size: [0.32, 0.3, 0.32], offset: [0, 0.82, 0.03], paletteKey: 'charcoalFur' },
      { size: [0.1, 0.08, 0.18], offset: [0, 0.8, 0.24], paletteKey: 'lanternAmber' },
      { size: [0.05, 0.05, 0.04], offset: [-0.08, 0.86, 0.18], paletteKey: 'snowCream' },
      { size: [0.05, 0.05, 0.04], offset: [0.08, 0.86, 0.18], paletteKey: 'snowCream' },
      // Flippers & webbed feet
      { size: [0.08, 0.42, 0.18], offset: [-0.25, 0.42, 0], paletteKey: 'graniteSlate' },
      { size: [0.08, 0.42, 0.18], offset: [0.25, 0.42, 0], paletteKey: 'graniteSlate' },
      { size: [0.12, 0.06, 0.2], offset: [-0.1, 0.05, 0.08], paletteKey: 'lanternAmber' },
      { size: [0.12, 0.06, 0.2], offset: [0.1, 0.05, 0.08], paletteKey: 'lanternAmber' }
    ]
  },
  {
    filename: 'animal-otter.glb',
    name: 'animal-otter',
    parts: [
      // Sleek cinnamon torso & buff belly
      { size: [0.34, 0.26, 0.68], offset: [0, 0.24, 0], paletteKey: 'otterCinnamon' },
      { size: [0.26, 0.1, 0.56], offset: [0, 0.16, 0.04], paletteKey: 'otterBuff' },
      // Head, whiskered snout, nose
      { size: [0.28, 0.26, 0.28], offset: [0, 0.36, 0.36], paletteKey: 'otterCinnamon' },
      { size: [0.16, 0.12, 0.12], offset: [0, 0.33, 0.52], paletteKey: 'otterBuff' },
      { size: [0.06, 0.05, 0.05], offset: [0, 0.36, 0.58], paletteKey: 'charcoalFur' },
      // Tapered tail & 4 short paws
      { size: [0.16, 0.14, 0.42], offset: [0, 0.18, -0.46], paletteKey: 'cedarBark' },
      { size: [0.1, 0.14, 0.12], offset: [-0.14, 0.08, 0.2], paletteKey: 'cedarBark' },
      { size: [0.1, 0.14, 0.12], offset: [0.14, 0.08, 0.2], paletteKey: 'cedarBark' },
      { size: [0.1, 0.14, 0.12], offset: [-0.14, 0.08, -0.2], paletteKey: 'cedarBark' },
      { size: [0.1, 0.14, 0.12], offset: [0.14, 0.08, -0.2], paletteKey: 'cedarBark' }
    ]
  },
  {
    filename: 'prop-food-stall.glb',
    name: 'prop-food-stall',
    parts: [
      { size: [1.9, 1.1, 1.25], offset: [0, 0.55, 0], paletteKey: 'warmTimber' },
      { size: [2.05, 0.1, 1.38], offset: [0, 1.14, 0.06], paletteKey: 'otterBuff' },
      { size: [0.12, 1.3, 0.12], offset: [-0.85, 1.75, 0.5], paletteKey: 'cedarBark' },
      { size: [0.12, 1.3, 0.12], offset: [0.85, 1.75, 0.5], paletteKey: 'cedarBark' },
      { size: [0.12, 1.3, 0.12], offset: [-0.85, 1.75, -0.5], paletteKey: 'cedarBark' },
      { size: [0.12, 1.3, 0.12], offset: [0.85, 1.75, -0.5], paletteKey: 'cedarBark' },
      { size: [2.2, 0.45, 1.6], offset: [0, 2.45, 0], paletteKey: 'terracottaRoof' },
      { size: [2.1, 0.16, 0.16], offset: [0, 2.2, 0.68], paletteKey: 'sunflowerGold' }
    ]
  },
  {
    filename: 'prop-cafe-table.glb',
    name: 'prop-cafe-table',
    parts: [
      { size: [0.28, 0.84, 0.28], offset: [0, 0.42, 0], paletteKey: 'cedarBark' },
      { size: [1.36, 0.08, 1.36], offset: [0, 0.84, 0], paletteKey: 'otterBuff' },
      { size: [0.08, 1.65, 0.08], offset: [0, 1.65, 0], paletteKey: 'snowCream' },
      { size: [2.1, 0.36, 2.1], offset: [0, 2.48, 0], paletteKey: 'pondTeal' }
    ]
  },
  {
    filename: 'prop-picnic-table.glb',
    name: 'prop-picnic-table',
    parts: [
      { size: [0.92, 0.08, 1.65], offset: [0, 0.78, 0], paletteKey: 'warmTimber' },
      { size: [0.8, 0.76, 0.12], offset: [0, 0.38, -0.55], paletteKey: 'cedarBark' },
      { size: [0.8, 0.76, 0.12], offset: [0, 0.38, 0.55], paletteKey: 'cedarBark' },
      { size: [0.38, 0.08, 1.55], offset: [-0.95, 0.46, 0], paletteKey: 'warmTimber' },
      { size: [0.38, 0.08, 1.55], offset: [0.95, 0.46, 0], paletteKey: 'warmTimber' }
    ]
  },
  {
    filename: 'prop-ticket-booth.glb',
    name: 'prop-ticket-booth',
    parts: [
      { size: [2.4, 2.2, 2.2], offset: [0, 1.1, 0], paletteKey: 'warmTimber' },
      { size: [1.4, 0.9, 0.12], offset: [0, 1.25, 1.1], paletteKey: 'snowCream' },
      { size: [1.4, 0.9, 0.12], offset: [0, 1.25, -1.1], paletteKey: 'snowCream' },
      { size: [2.55, 0.18, 2.35], offset: [0, 2.15, 0], paletteKey: 'sunflowerGold' },
      { size: [2.7, 0.85, 2.5], offset: [0, 2.65, 0], paletteKey: 'terracottaRoof' }
    ]
  },
  {
    filename: 'prop-fountain.glb',
    name: 'prop-fountain',
    parts: [
      { size: [2.8, 0.7, 2.8], offset: [0, 0.35, 0], paletteKey: 'stonePath' },
      { size: [2.3, 0.14, 2.3], offset: [0, 0.66, 0], paletteKey: 'pondTeal' },
      { size: [0.65, 1.4, 0.65], offset: [0, 1.35, 0], paletteKey: 'graniteSlate' },
      { size: [0.7, 0.7, 0.7], offset: [0, 2.15, 0], paletteKey: 'sunflowerGold' }
    ]
  }
];

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

for (const def of ASSET_DEFINITIONS) {
  const glbBuffer = buildStylizedGlb(def);
  const outPath = path.join(OUTPUT_DIR, def.filename);
  fs.writeFileSync(outPath, glbBuffer);
}

console.log(`Generated ${ASSET_DEFINITIONS.length} binary .glb assets in ${OUTPUT_DIR}`);
