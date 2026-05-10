import { readStl, writeStl, stlToIndexed, indexedToStl } from "./stl-io.js";
import { readdir } from "node:fs/promises";
import { join, basename } from "node:path";

type Vec3 = [number, number, number];
type Box = { min: Vec3; max: Vec3 };

interface ManifoldInstance {
  numVert(): number;
  numTri(): number;
  volume(): number;
  boundingBox(): Box;
  isEmpty(): boolean;
  status(): string;
  scale(v: Vec3 | number): ManifoldInstance;
  translate(v: Vec3): ManifoldInstance;
  translate(x: number, y: number, z: number): ManifoldInstance;
  rotate(v: Vec3): ManifoldInstance;
  add(other: ManifoldInstance): ManifoldInstance;
  subtract(other: ManifoldInstance): ManifoldInstance;
  getMesh(): { numProp: number; vertProperties: Float32Array; triVerts: Uint32Array };
  delete(): void;
}

interface ManifoldModule {
  Manifold: {
    new (mesh: unknown): ManifoldInstance;
    cube(size?: Vec3 | number, center?: boolean): ManifoldInstance;
    cylinder(
      height: number,
      radiusLow: number,
      radiusHigh?: number,
      circularSegments?: number,
      center?: boolean,
    ): ManifoldInstance;
  };
  Mesh: new (opts: {
    numProp: number;
    vertProperties: Float32Array;
    triVerts: Uint32Array;
  }) => unknown;
  setup(): void;
  setCircularSegments(n: number): void;
}

let moduleInstance: ManifoldModule | null = null;

async function getModule(): Promise<ManifoldModule> {
  if (moduleInstance) return moduleInstance;
  const mod = await import("manifold-3d/manifold.js");
  const init = mod.default ?? mod;
  const instance = (await init()) as unknown as ManifoldModule;
  instance.setup();
  moduleInstance = instance;
  return moduleInstance;
}

async function loadStlAsManifold(filePath: string): Promise<ManifoldInstance> {
  const mod = await getModule();
  const stl = await readStl(filePath);
  const { vertProperties, triVerts } = stlToIndexed(stl);
  const mesh = new mod.Mesh({ numProp: 3, vertProperties, triVerts });
  return new mod.Manifold(mesh);
}

async function saveManifoldAsStl(manifold: ManifoldInstance, outputPath: string): Promise<void> {
  const mesh = manifold.getMesh();
  const stl = indexedToStl(mesh.vertProperties, mesh.triVerts, mesh.numProp);
  await writeStl(outputPath, stl);
}

// --- Seam Detection ---

export interface SeamInfo {
  seam: string; // e.g. "A-B"
  partA: string;
  partB: string;
  plane: { normal: Vec3; offset: number };
  centroid: Vec3;
}

/**
 * Detect seams between split parts by finding shared bounding box faces.
 * Parts that share a face (within tolerance) are neighbors.
 */
export async function detectSeams(
  partsDir: string,
  tolerance: number = 0.5,
): Promise<SeamInfo[]> {
  const files = await readdir(partsDir);
  const stlFiles = files.filter((f) => f.endsWith(".stl")).sort();

  // Load bounds for each part
  const partBounds: Array<{ id: string; file: string; box: Box }> = [];
  for (const file of stlFiles) {
    const filePath = join(partsDir, file);
    const manifold = await loadStlAsManifold(filePath);
    const box = manifold.boundingBox();
    const id = basename(file, ".stl").replace("part_", "");
    partBounds.push({ id, file: filePath, box });
    manifold.delete();
  }

  const seams: SeamInfo[] = [];

  // Compare each pair of parts
  for (let i = 0; i < partBounds.length; i++) {
    for (let j = i + 1; j < partBounds.length; j++) {
      const a = partBounds[i];
      const b = partBounds[j];

      // Check if any face of A is near any face of B
      const shared = findSharedPlane(a.box, b.box, tolerance);
      if (shared) {
        seams.push({
          seam: `${a.id}-${b.id}`,
          partA: a.id,
          partB: b.id,
          plane: shared.plane,
          centroid: shared.centroid,
        });
      }
    }
  }

  return seams;
}

// Check if two ranges overlap with positive area
function rangesOverlap(aMin: number, aMax: number, bMin: number, bMax: number): boolean {
  return Math.min(aMax, bMax) - Math.max(aMin, bMin) > 0.01;
}

function findSharedPlane(
  a: Box,
  b: Box,
  tolerance: number,
): { plane: { normal: Vec3; offset: number }; centroid: Vec3 } | null {
  // Check X axis: a.max.x ≈ b.min.x or a.min.x ≈ b.max.x
  // Both Y and Z ranges must overlap for a real face adjacency
  if (Math.abs(a.max[0] - b.min[0]) < tolerance &&
      rangesOverlap(a.min[1], a.max[1], b.min[1], b.max[1]) &&
      rangesOverlap(a.min[2], a.max[2], b.min[2], b.max[2])) {
    const offset = a.max[0];
    return {
      plane: { normal: [1, 0, 0], offset },
      centroid: [
        offset,
        (Math.max(a.min[1], b.min[1]) + Math.min(a.max[1], b.max[1])) / 2,
        (Math.max(a.min[2], b.min[2]) + Math.min(a.max[2], b.max[2])) / 2,
      ],
    };
  }
  if (Math.abs(a.min[0] - b.max[0]) < tolerance &&
      rangesOverlap(a.min[1], a.max[1], b.min[1], b.max[1]) &&
      rangesOverlap(a.min[2], a.max[2], b.min[2], b.max[2])) {
    const offset = a.min[0];
    return {
      plane: { normal: [-1, 0, 0], offset: -offset },
      centroid: [
        offset,
        (Math.max(a.min[1], b.min[1]) + Math.min(a.max[1], b.max[1])) / 2,
        (Math.max(a.min[2], b.min[2]) + Math.min(a.max[2], b.max[2])) / 2,
      ],
    };
  }

  // Check Y axis
  if (Math.abs(a.max[1] - b.min[1]) < tolerance &&
      rangesOverlap(a.min[0], a.max[0], b.min[0], b.max[0]) &&
      rangesOverlap(a.min[2], a.max[2], b.min[2], b.max[2])) {
    const offset = a.max[1];
    return {
      plane: { normal: [0, 1, 0], offset },
      centroid: [
        (Math.max(a.min[0], b.min[0]) + Math.min(a.max[0], b.max[0])) / 2,
        offset,
        (Math.max(a.min[2], b.min[2]) + Math.min(a.max[2], b.max[2])) / 2,
      ],
    };
  }
  if (Math.abs(a.min[1] - b.max[1]) < tolerance &&
      rangesOverlap(a.min[0], a.max[0], b.min[0], b.max[0]) &&
      rangesOverlap(a.min[2], a.max[2], b.min[2], b.max[2])) {
    const offset = a.min[1];
    return {
      plane: { normal: [0, -1, 0], offset: -offset },
      centroid: [
        (Math.max(a.min[0], b.min[0]) + Math.min(a.max[0], b.max[0])) / 2,
        offset,
        (Math.max(a.min[2], b.min[2]) + Math.min(a.max[2], b.max[2])) / 2,
      ],
    };
  }

  // Check Z axis
  if (Math.abs(a.max[2] - b.min[2]) < tolerance &&
      rangesOverlap(a.min[0], a.max[0], b.min[0], b.max[0]) &&
      rangesOverlap(a.min[1], a.max[1], b.min[1], b.max[1])) {
    const offset = a.max[2];
    return {
      plane: { normal: [0, 0, 1], offset },
      centroid: [
        (Math.max(a.min[0], b.min[0]) + Math.min(a.max[0], b.max[0])) / 2,
        (Math.max(a.min[1], b.min[1]) + Math.min(a.max[1], b.max[1])) / 2,
        offset,
      ],
    };
  }
  if (Math.abs(a.min[2] - b.max[2]) < tolerance &&
      rangesOverlap(a.min[0], a.max[0], b.min[0], b.max[0]) &&
      rangesOverlap(a.min[1], a.max[1], b.min[1], b.max[1])) {
    const offset = a.min[2];
    return {
      plane: { normal: [0, 0, -1], offset: -offset },
      centroid: [
        (Math.max(a.min[0], b.min[0]) + Math.min(a.max[0], b.max[0])) / 2,
        (Math.max(a.min[1], b.min[1]) + Math.min(a.max[1], b.max[1])) / 2,
        offset,
      ],
    };
  }

  return null;
}

// --- Dowel Connector Generation ---

export interface ConnectorSpec {
  type: "dowel";
  diameterMm: number;
  depthMm: number;
  clearanceMm: number;
  countPerSeam: number;
}

export interface ConnectorResult {
  seam: string;
  type: string;
  positions: Vec3[];
  malePartId: string;
  femalePartId: string;
}

/**
 * Add dowel connectors to split parts along their seams.
 * Male side gets cylindrical protrusions, female side gets holes.
 */
export async function addDowelConnectors(
  partsDir: string,
  outputDir: string,
  connector: ConnectorSpec,
): Promise<{
  parts: Array<{ id: string; file: string }>;
  connectors: ConnectorResult[];
}> {
  const mod = await getModule();
  mod.setCircularSegments(32); // Smooth cylinders

  const seams = await detectSeams(partsDir);
  const files = await readdir(partsDir);
  const stlFiles = files.filter((f) => f.endsWith(".stl")).sort();

  // Load all parts
  const parts = new Map<string, { manifold: ManifoldInstance; file: string }>();
  for (const file of stlFiles) {
    const filePath = join(partsDir, file);
    const id = basename(file, ".stl").replace("part_", "");
    const manifold = await loadStlAsManifold(filePath);
    parts.set(id, { manifold, file: filePath });
  }

  const connectorResults: ConnectorResult[] = [];

  for (const seam of seams) {
    const partA = parts.get(seam.partA);
    const partB = parts.get(seam.partB);
    if (!partA || !partB) continue;

    // Determine connector positions along the seam
    const positions = distributeConnectors(
      seam,
      partA.manifold.boundingBox(),
      partB.manifold.boundingBox(),
      connector.countPerSeam,
    );

    // For each connector position, create male (protrusion) and female (hole)
    const radius = connector.diameterMm / 2;
    const femaleRadius = radius + connector.clearanceMm;
    const depth = connector.depthMm;
    const femaleDepth = depth + 1; // Extra depth for clearance

    // Determine cylinder orientation based on seam normal
    const normal = seam.plane.normal;

    for (const pos of positions) {
      // Create male cylinder (protrusion on part A)
      const maleCyl = mod.Manifold.cylinder(depth, radius, radius, 32, false);
      const orientedMale = orientCylinder(maleCyl, normal, pos);
      partA.manifold = partA.manifold.add(orientedMale);
      orientedMale.delete();

      // Create female cylinder (hole in part B)
      const femaleCyl = mod.Manifold.cylinder(femaleDepth, femaleRadius, femaleRadius, 32, false);
      const orientedFemale = orientCylinder(femaleCyl, normal, pos);
      partB.manifold = partB.manifold.subtract(orientedFemale);
      orientedFemale.delete();
    }

    connectorResults.push({
      seam: seam.seam,
      type: connector.type,
      positions,
      malePartId: seam.partA,
      femalePartId: seam.partB,
    });
  }

  // Export modified parts
  const outputParts: Array<{ id: string; file: string }> = [];
  for (const [id, part] of parts) {
    const outPath = join(outputDir, `part_${id}.stl`);
    await saveManifoldAsStl(part.manifold, outPath);
    part.manifold.delete();
    outputParts.push({ id, file: outPath });
  }

  return { parts: outputParts, connectors: connectorResults };
}

function orientCylinder(
  cylinder: ManifoldInstance,
  normal: Vec3,
  position: Vec3,
): ManifoldInstance {
  // Cylinder defaults to Z-axis. Rotate to match seam normal.
  let rotated: ManifoldInstance;

  if (Math.abs(normal[0]) > 0.9) {
    // X-axis: rotate 90 degrees around Y
    rotated = cylinder.rotate([0, normal[0] > 0 ? 90 : -90, 0]);
  } else if (Math.abs(normal[1]) > 0.9) {
    // Y-axis: rotate 90 degrees around X
    rotated = cylinder.rotate([normal[1] > 0 ? -90 : 90, 0, 0]);
  } else {
    // Z-axis: no rotation needed (or flip if negative)
    rotated = normal[2] < 0 ? cylinder.rotate([180, 0, 0]) : cylinder;
  }

  const translated = rotated.translate(position);
  if (rotated !== cylinder) rotated.delete();
  return translated;
}

function distributeConnectors(
  seam: SeamInfo,
  boxA: Box,
  boxB: Box,
  count: number,
): Vec3[] {
  const normal = seam.plane.normal;
  const positions: Vec3[] = [];

  // Find the overlap region between the two parts on the seam plane
  const overlapMin: Vec3 = [
    Math.max(boxA.min[0], boxB.min[0]),
    Math.max(boxA.min[1], boxB.min[1]),
    Math.max(boxA.min[2], boxB.min[2]),
  ];
  const overlapMax: Vec3 = [
    Math.min(boxA.max[0], boxB.max[0]),
    Math.min(boxA.max[1], boxB.max[1]),
    Math.min(boxA.max[2], boxB.max[2]),
  ];

  // Determine which two axes to distribute along (perpendicular to normal)
  let axis1: number, axis2: number, fixedAxis: number;
  if (Math.abs(normal[0]) > 0.9) {
    fixedAxis = 0;
    axis1 = 1;
    axis2 = 2;
  } else if (Math.abs(normal[1]) > 0.9) {
    fixedAxis = 1;
    axis1 = 0;
    axis2 = 2;
  } else {
    fixedAxis = 2;
    axis1 = 0;
    axis2 = 1;
  }

  const fixedValue = seam.plane.offset * (normal[fixedAxis] < 0 ? -1 : 1);
  const range1 = overlapMax[axis1] - overlapMin[axis1];
  const range2 = overlapMax[axis2] - overlapMin[axis2];

  // Distribute connectors in a grid-like pattern
  const margin = 0.15; // 15% margin from edges
  const cols = Math.max(1, Math.ceil(Math.sqrt(count * (range1 / range2))));
  const rows = Math.max(1, Math.ceil(count / cols));

  for (let r = 0; r < rows && positions.length < count; r++) {
    for (let c = 0; c < cols && positions.length < count; c++) {
      const t1 = margin + ((1 - 2 * margin) * (c + 0.5)) / cols;
      const t2 = margin + ((1 - 2 * margin) * (r + 0.5)) / rows;

      const pos: Vec3 = [0, 0, 0];
      pos[fixedAxis] = fixedValue;
      pos[axis1] = overlapMin[axis1] + t1 * range1;
      pos[axis2] = overlapMin[axis2] + t2 * range2;
      positions.push(pos);
    }
  }

  return positions;
}
