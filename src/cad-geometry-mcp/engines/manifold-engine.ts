import { readStl, writeStl, stlToIndexed, indexedToStl } from "./stl-io.js";

// manifold-3d types
type Vec3 = [number, number, number];
type Box = { min: Vec3; max: Vec3 };

interface ManifoldInstance {
  numVert(): number;
  numTri(): number;
  volume(): number;
  surfaceArea(): number;
  boundingBox(): Box;
  genus(): number;
  status(): string;
  isEmpty(): boolean;
  scale(v: Vec3 | number): ManifoldInstance;
  translate(v: Vec3): ManifoldInstance;
  translate(x: number, y: number, z: number): ManifoldInstance;
  rotate(v: Vec3): ManifoldInstance;
  rotate(x: number, y?: number, z?: number): ManifoldInstance;
  trimByPlane(normal: Vec3, originOffset: number): ManifoldInstance;
  splitByPlane(normal: Vec3, originOffset: number): [ManifoldInstance, ManifoldInstance];
  add(other: ManifoldInstance): ManifoldInstance;
  subtract(other: ManifoldInstance): ManifoldInstance;
  intersect(other: ManifoldInstance): ManifoldInstance;
  getMesh(normalIdx?: number): MeshInstance;
  delete(): void;
}

interface MeshInstance {
  numProp: number;
  vertProperties: Float32Array;
  triVerts: Uint32Array;
  numTri: number;
  numVert: number;
}

interface ManifoldModule {
  Manifold: {
    new (mesh: MeshInstance): ManifoldInstance;
    ofMesh(mesh: MeshInstance): ManifoldInstance;
    cube(size?: Vec3 | number, center?: boolean): ManifoldInstance;
    cylinder(
      height: number,
      radiusLow: number,
      radiusHigh?: number,
      circularSegments?: number,
      center?: boolean,
    ): ManifoldInstance;
    sphere(radius: number, circularSegments?: number): ManifoldInstance;
  };
  Mesh: new (opts: {
    numProp: number;
    vertProperties: Float32Array;
    triVerts: Uint32Array;
  }) => MeshInstance;
  setCircularSegments(n: number): void;
  setup(): void;
}

let moduleInstance: ManifoldModule | null = null;

async function getModule(): Promise<ManifoldModule> {
  if (moduleInstance) return moduleInstance;
  // Dynamic import of the WASM module
  const mod = await import("manifold-3d/manifold.js");
  const init = mod.default ?? mod;
  const instance = (await init()) as unknown as ManifoldModule;
  instance.setup();
  moduleInstance = instance;
  return moduleInstance;
}

export interface MeshInfo {
  bounds: { min: Vec3; max: Vec3; size: Vec3 };
  triangleCount: number;
  vertexCount: number;
  volume: number;
  surfaceArea: number;
  watertight: boolean;
  genus: number;
  units: string;
}

export interface SplitResult {
  parts: Array<{
    id: string;
    file: string;
    bounds: { min: Vec3; max: Vec3; size: Vec3 };
    fitsVolume: boolean;
  }>;
  totalParts: number;
  strategy: string;
}

function boundsWithSize(box: Box) {
  return {
    min: box.min,
    max: box.max,
    size: [
      box.max[0] - box.min[0],
      box.max[1] - box.min[1],
      box.max[2] - box.min[2],
    ] as Vec3,
  };
}

async function loadStlAsManifold(
  filePath: string,
): Promise<{ manifold: ManifoldInstance; mod: ManifoldModule }> {
  const mod = await getModule();
  const stl = await readStl(filePath);
  const { vertProperties, triVerts } = stlToIndexed(stl);
  const mesh = new mod.Mesh({ numProp: 3, vertProperties, triVerts });
  const manifold = new mod.Manifold(mesh);
  return { manifold, mod };
}

async function saveManifoldAsStl(
  manifold: ManifoldInstance,
  outputPath: string,
): Promise<void> {
  const mesh = manifold.getMesh();
  const stl = indexedToStl(mesh.vertProperties, mesh.triVerts, mesh.numProp);
  await writeStl(outputPath, stl);
}

export async function inspectMesh(filePath: string): Promise<MeshInfo> {
  const { manifold } = await loadStlAsManifold(filePath);
  try {
    const box = manifold.boundingBox();
    const genus = manifold.genus();
    return {
      bounds: boundsWithSize(box),
      triangleCount: manifold.numTri(),
      vertexCount: manifold.numVert(),
      volume: manifold.volume(),
      surfaceArea: manifold.surfaceArea(),
      watertight: genus === 0 && manifold.status() === "NoError",
      genus,
      units: "mm",
    };
  } finally {
    manifold.delete();
  }
}

export async function repairMesh(
  inputPath: string,
  outputPath: string,
): Promise<{
  output: string;
  watertightBefore: boolean;
  watertightAfter: boolean;
  trianglesBefore: number;
  trianglesAfter: number;
}> {
  const stl = await readStl(inputPath);
  const triBefore = stl.triangleCount;
  const { vertProperties, triVerts } = stlToIndexed(stl);

  const mod = await getModule();
  const mesh = new mod.Mesh({ numProp: 3, vertProperties, triVerts });

  // Check watertight before — try constructing, if it fails it's not manifold
  let watertightBefore = false;
  try {
    const testManifold = new mod.Manifold(mesh);
    watertightBefore =
      testManifold.genus() === 0 && testManifold.status() === "NoError";
    testManifold.delete();
  } catch {
    watertightBefore = false;
  }

  // Manifold constructor auto-repairs: fixes normals, merges vertices, removes degenerate faces
  const repaired = new mod.Manifold(mesh);
  const watertightAfter =
    repaired.genus() === 0 && repaired.status() === "NoError";
  const triAfter = repaired.numTri();

  await saveManifoldAsStl(repaired, outputPath);
  repaired.delete();

  return {
    output: outputPath,
    watertightBefore,
    watertightAfter,
    trianglesBefore: triBefore,
    trianglesAfter: triAfter,
  };
}

export async function scaleMesh(
  inputPath: string,
  outputPath: string,
  factor: number,
): Promise<{
  output: string;
  originalBounds: { min: Vec3; max: Vec3; size: Vec3 };
  newBounds: { min: Vec3; max: Vec3; size: Vec3 };
  scaleFactor: number;
}> {
  const { manifold } = await loadStlAsManifold(inputPath);
  try {
    const originalBounds = boundsWithSize(manifold.boundingBox());
    const scaled = manifold.scale([factor, factor, factor]);

    const newBounds = boundsWithSize(scaled.boundingBox());
    await saveManifoldAsStl(scaled, outputPath);
    scaled.delete();

    return { output: outputPath, originalBounds, newBounds, scaleFactor: factor };
  } finally {
    manifold.delete();
  }
}

export async function splitMesh(
  inputPath: string,
  buildVolume: Vec3,
  outputDir: string,
  strategy: "min_parts" | "grid" = "min_parts",
): Promise<SplitResult> {
  const { manifold } = await loadStlAsManifold(inputPath);

  try {
    const box = manifold.boundingBox();
    const size: Vec3 = [
      box.max[0] - box.min[0],
      box.max[1] - box.min[1],
      box.max[2] - box.min[2],
    ];

    // Determine cuts needed per axis
    const cutsX = Math.max(1, Math.ceil(size[0] / buildVolume[0]));
    const cutsY = Math.max(1, Math.ceil(size[1] / buildVolume[1]));
    const cutsZ = Math.max(1, Math.ceil(size[2] / buildVolume[2]));

    if (cutsX === 1 && cutsY === 1 && cutsZ === 1) {
      // Model already fits — just copy
      const { join } = await import("node:path");
      const outPath = join(outputDir, "part_A.stl");
      await saveManifoldAsStl(manifold, outPath);
      const b = boundsWithSize(manifold.boundingBox());
      return {
        parts: [{ id: "A", file: outPath, bounds: b, fitsVolume: true }],
        totalParts: 1,
        strategy,
      };
    }

    // Split along each axis using splitByPlane
    let pieces: ManifoldInstance[] = [manifold];

    // Split along X axis
    if (cutsX > 1) {
      const stepX = size[0] / cutsX;
      const newPieces: ManifoldInstance[] = [];
      for (const piece of pieces) {
        let remaining = piece;
        for (let i = 1; i < cutsX; i++) {
          const planeX = box.min[0] + i * stepX;
          const [left, right] = remaining.splitByPlane([1, 0, 0], planeX);
          newPieces.push(left);
          remaining = right;
        }
        newPieces.push(remaining);
      }
      pieces = newPieces;
    }

    // Split along Y axis
    if (cutsY > 1) {
      const stepY = size[1] / cutsY;
      const newPieces: ManifoldInstance[] = [];
      for (const piece of pieces) {
        let remaining = piece;
        for (let i = 1; i < cutsY; i++) {
          const planeY = box.min[1] + i * stepY;
          const [front, back] = remaining.splitByPlane([0, 1, 0], planeY);
          newPieces.push(front);
          remaining = back;
        }
        newPieces.push(remaining);
      }
      pieces = newPieces;
    }

    // Split along Z axis
    if (cutsZ > 1) {
      const stepZ = size[2] / cutsZ;
      const newPieces: ManifoldInstance[] = [];
      for (const piece of pieces) {
        let remaining = piece;
        for (let i = 1; i < cutsZ; i++) {
          const planeZ = box.min[2] + i * stepZ;
          const [bottom, top] = remaining.splitByPlane([0, 0, 1], planeZ);
          newPieces.push(bottom);
          remaining = top;
        }
        newPieces.push(remaining);
      }
      pieces = newPieces;
    }

    // Export each piece
    const { join } = await import("node:path");
    const parts: SplitResult["parts"] = [];
    const labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i];
      if (piece.isEmpty()) {
        piece.delete();
        continue;
      }

      const id = i < 26 ? labels[i] : `P${i}`;
      const outPath = join(outputDir, `part_${id}.stl`);
      await saveManifoldAsStl(piece, outPath);

      const pBox = piece.boundingBox();
      const pSize: Vec3 = [
        pBox.max[0] - pBox.min[0],
        pBox.max[1] - pBox.min[1],
        pBox.max[2] - pBox.min[2],
      ];
      const fitsVolume =
        pSize[0] <= buildVolume[0] &&
        pSize[1] <= buildVolume[1] &&
        pSize[2] <= buildVolume[2];

      parts.push({
        id,
        file: outPath,
        bounds: boundsWithSize(pBox),
        fitsVolume,
      });

      piece.delete();
    }

    return { parts, totalParts: parts.length, strategy };
  } finally {
    // manifold already consumed by splits or deleted in parts loop
  }
}

export async function layFlat(
  inputPath: string,
  outputPath: string,
): Promise<{ output: string; rotationApplied: Vec3 }> {
  const { manifold } = await loadStlAsManifold(inputPath);

  try {
    // Find the largest flat face by analyzing triangle areas and normals
    const mesh = manifold.getMesh();
    const faceAreas = new Map<string, number>();

    for (let t = 0; t < mesh.triVerts.length / 3; t++) {
      const i0 = mesh.triVerts[t * 3];
      const i1 = mesh.triVerts[t * 3 + 1];
      const i2 = mesh.triVerts[t * 3 + 2];

      const np = mesh.numProp;
      const v0 = [
        mesh.vertProperties[i0 * np],
        mesh.vertProperties[i0 * np + 1],
        mesh.vertProperties[i0 * np + 2],
      ];
      const v1 = [
        mesh.vertProperties[i1 * np],
        mesh.vertProperties[i1 * np + 1],
        mesh.vertProperties[i1 * np + 2],
      ];
      const v2 = [
        mesh.vertProperties[i2 * np],
        mesh.vertProperties[i2 * np + 1],
        mesh.vertProperties[i2 * np + 2],
      ];

      // Cross product for area and normal
      const e1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
      const e2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];
      const nx = e1[1] * e2[2] - e1[2] * e2[1];
      const ny = e1[2] * e2[0] - e1[0] * e2[2];
      const nz = e1[0] * e2[1] - e1[1] * e2[0];
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (len < 1e-10) continue;

      const area = len / 2;
      // Quantize normal to group coplanar faces
      const qn = `${(nx / len).toFixed(3)},${(ny / len).toFixed(3)},${(nz / len).toFixed(3)}`;
      faceAreas.set(qn, (faceAreas.get(qn) ?? 0) + area);
    }

    // Find the normal with the largest total area
    let bestNormal = [0, 0, -1]; // default: bottom face
    let bestArea = 0;
    for (const [key, area] of faceAreas) {
      if (area > bestArea) {
        bestArea = area;
        const parts = key.split(",").map(Number);
        bestNormal = parts;
      }
    }

    // Calculate rotation to align bestNormal with [0, 0, -1] (face down)
    const target = [0, 0, -1];
    const dot =
      bestNormal[0] * target[0] +
      bestNormal[1] * target[1] +
      bestNormal[2] * target[2];

    let rotX = 0;
    let rotY = 0;

    if (Math.abs(dot - 1) > 1e-6 && Math.abs(dot + 1) > 1e-6) {
      // Need rotation
      rotX = Math.atan2(bestNormal[1], -bestNormal[2]) * (180 / Math.PI);
      const projected = Math.sqrt(
        bestNormal[1] * bestNormal[1] + bestNormal[2] * bestNormal[2],
      );
      rotY = Math.atan2(bestNormal[0], projected) * (180 / Math.PI);
    } else if (Math.abs(dot + 1) < 1e-6) {
      // Normal is pointing up, flip 180 degrees
      rotX = 180;
    }

    const rotation: Vec3 = [rotX, rotY, 0];
    const rotated = manifold.rotate(rotation);

    // Ensure on bed: translate so min Z = 0
    const rBox = rotated.boundingBox();
    const final = rotated.translate([0, 0, -rBox.min[2]]);

    await saveManifoldAsStl(final, outputPath);
    final.delete();
    rotated.delete();

    return { output: outputPath, rotationApplied: rotation };
  } finally {
    manifold.delete();
  }
}
