import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, '../../../apps/web/public/assets/models');

/**
 * Creates a spec-compliant glTF 2.0 binary (.glb) buffer with stylized box/prism primitives
 * and PBR metallic-roughness materials so GLTFLoader / useGLTF can load real .glb assets
 * without requiring browser FileReader APIs at build time.
 * @param {{ name: string; parts: Array<{ size: number[]; offset: number[]; color: number[]; metallic?: number; roughness?: number }> }} definition
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

    // 6 faces of a box (24 vertices, 36 indices)
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
      name: `${name}_mat_${partIdx}`,
      pbrMetallicRoughness: {
        baseColorFactor: part.color,
        metallicFactor: part.metallic ?? 0.05,
        roughnessFactor: part.roughness ?? 0.75
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
      generator: '@online-zoo/game-assets deterministic GLB builder'
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

const ASSET_DEFINITIONS = [
  {
    filename: 'avatar-explorer.glb',
    name: 'avatar-explorer',
    parts: [
      // Torso (Forest Ranger Jacket)
      { size: [0.55, 0.7, 0.35], offset: [0, 0.85, 0], color: [0.22, 0.56, 0.34, 1.0] },
      // Head
      { size: [0.46, 0.46, 0.46], offset: [0, 1.48, 0], color: [0.96, 0.84, 0.72, 1.0] },
      // Panda Explorer Hat Crown & Ears
      { size: [0.54, 0.18, 0.54], offset: [0, 1.75, 0], color: [0.95, 0.96, 0.94, 1.0] },
      { size: [0.16, 0.16, 0.12], offset: [-0.22, 1.88, 0], color: [0.12, 0.14, 0.16, 1.0] },
      { size: [0.16, 0.16, 0.12], offset: [0.22, 1.88, 0], color: [0.12, 0.14, 0.16, 1.0] },
      // Backpack
      { size: [0.42, 0.48, 0.22], offset: [0, 0.9, -0.26], color: [0.58, 0.38, 0.2, 1.0] }
    ]
  },
  {
    filename: 'prop-bamboo-cluster.glb',
    name: 'prop-bamboo-cluster',
    parts: [
      { size: [0.18, 6.5, 0.18], offset: [0, 3.25, 0], color: [0.26, 0.68, 0.34, 1.0] },
      { size: [0.16, 5.8, 0.16], offset: [0.35, 2.9, 0.2], color: [0.32, 0.74, 0.38, 1.0] },
      { size: [0.15, 6.2, 0.15], offset: [-0.3, 3.1, -0.25], color: [0.22, 0.62, 0.3, 1.0] },
      { size: [1.4, 1.2, 1.4], offset: [0, 6.0, 0], color: [0.38, 0.8, 0.44, 1.0] }
    ]
  },
  {
    filename: 'prop-stone-lantern.glb',
    name: 'prop-stone-lantern',
    parts: [
      { size: [0.9, 0.25, 0.9], offset: [0, 0.125, 0], color: [0.52, 0.54, 0.56, 1.0] },
      { size: [0.38, 1.1, 0.38], offset: [0, 0.8, 0], color: [0.58, 0.6, 0.62, 1.0] },
      { size: [0.65, 0.5, 0.65], offset: [0, 1.6, 0], color: [0.98, 0.82, 0.38, 1.0] },
      { size: [1.1, 0.28, 1.1], offset: [0, 2.0, 0], color: [0.42, 0.45, 0.48, 1.0] }
    ]
  },
  {
    filename: 'prop-habitat-plaque.glb',
    name: 'prop-habitat-plaque',
    parts: [
      { size: [0.16, 1.2, 0.16], offset: [-0.55, 0.6, 0], color: [0.46, 0.3, 0.16, 1.0] },
      { size: [0.16, 1.2, 0.16], offset: [0.55, 0.6, 0], color: [0.46, 0.3, 0.16, 1.0] },
      { size: [1.4, 0.85, 0.14], offset: [0, 1.25, 0], color: [0.88, 0.78, 0.58, 1.0] },
      { size: [1.56, 0.14, 0.28], offset: [0, 1.72, 0], color: [0.22, 0.52, 0.3, 1.0] }
    ]
  },
  {
    filename: 'prop-wind-chime.glb',
    name: 'prop-wind-chime',
    parts: [
      { size: [0.22, 2.6, 0.22], offset: [-0.8, 1.3, 0], color: [0.52, 0.34, 0.18, 1.0] },
      { size: [0.22, 2.6, 0.22], offset: [0.8, 1.3, 0], color: [0.52, 0.34, 0.18, 1.0] },
      { size: [2.1, 0.22, 0.45], offset: [0, 2.55, 0], color: [0.26, 0.58, 0.34, 1.0] },
      { size: [0.1, 0.75, 0.1], offset: [-0.25, 2.0, 0], color: [0.84, 0.72, 0.38, 1.0] },
      { size: [0.1, 0.85, 0.1], offset: [0, 1.95, 0], color: [0.88, 0.76, 0.42, 1.0] },
      { size: [0.1, 0.7, 0.1], offset: [0.25, 2.02, 0], color: [0.84, 0.72, 0.38, 1.0] }
    ]
  },
  {
    filename: 'prop-wooden-bench.glb',
    name: 'prop-wooden-bench',
    parts: [
      { size: [1.8, 0.12, 0.65], offset: [0, 0.5, 0], color: [0.62, 0.4, 0.22, 1.0] },
      { size: [1.8, 0.55, 0.12], offset: [0, 0.84, -0.26], color: [0.56, 0.36, 0.18, 1.0] },
      { size: [0.16, 0.5, 0.55], offset: [-0.75, 0.25, 0], color: [0.35, 0.36, 0.38, 1.0] },
      { size: [0.16, 0.5, 0.55], offset: [0.75, 0.25, 0], color: [0.35, 0.36, 0.38, 1.0] }
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

