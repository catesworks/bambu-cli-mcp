import { readFile, writeFile } from "node:fs/promises";

export interface StlMesh {
  vertices: Float32Array; // [x,y,z, x,y,z, ...] — 3 per vertex
  normals: Float32Array; // [nx,ny,nz, ...] — 1 per triangle
  triangleCount: number;
}

const HEADER_SIZE = 80;
const TRIANGLE_COUNT_SIZE = 4;
const BYTES_PER_TRIANGLE = 50; // 12 normal + 36 vertices + 2 attribute

export function isAsciiStl(buffer: Buffer): boolean {
  const header = buffer.subarray(0, 5).toString("ascii");
  return header === "solid" && buffer.indexOf(0x00, 0) > 80;
}

export function readBinaryStl(buffer: Buffer): StlMesh {
  const triangleCount = buffer.readUInt32LE(HEADER_SIZE);
  const expectedSize =
    HEADER_SIZE + TRIANGLE_COUNT_SIZE + triangleCount * BYTES_PER_TRIANGLE;

  if (buffer.length < expectedSize) {
    throw new Error(
      `STL file too small: expected ${expectedSize} bytes, got ${buffer.length}`,
    );
  }

  const vertices = new Float32Array(triangleCount * 9); // 3 vertices * 3 coords
  const normals = new Float32Array(triangleCount * 3);

  let offset = HEADER_SIZE + TRIANGLE_COUNT_SIZE;

  for (let i = 0; i < triangleCount; i++) {
    // Normal (3 floats)
    normals[i * 3] = buffer.readFloatLE(offset);
    normals[i * 3 + 1] = buffer.readFloatLE(offset + 4);
    normals[i * 3 + 2] = buffer.readFloatLE(offset + 8);
    offset += 12;

    // 3 vertices (9 floats)
    for (let v = 0; v < 9; v++) {
      vertices[i * 9 + v] = buffer.readFloatLE(offset);
      offset += 4;
    }

    // Skip attribute byte count
    offset += 2;
  }

  return { vertices, normals, triangleCount };
}

export function readAsciiStl(text: string): StlMesh {
  const vertexList: number[] = [];
  const normalList: number[] = [];

  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("facet normal")) {
      const parts = trimmed.split(/\s+/);
      normalList.push(
        parseFloat(parts[2]),
        parseFloat(parts[3]),
        parseFloat(parts[4]),
      );
    } else if (trimmed.startsWith("vertex")) {
      const parts = trimmed.split(/\s+/);
      vertexList.push(
        parseFloat(parts[1]),
        parseFloat(parts[2]),
        parseFloat(parts[3]),
      );
    }
  }

  const triangleCount = normalList.length / 3;
  return {
    vertices: new Float32Array(vertexList),
    normals: new Float32Array(normalList),
    triangleCount,
  };
}

export async function readStl(filePath: string): Promise<StlMesh> {
  const buffer = await readFile(filePath);
  if (isAsciiStl(buffer)) {
    return readAsciiStl(buffer.toString("ascii"));
  }
  return readBinaryStl(buffer);
}

export function writeBinaryStl(mesh: StlMesh): Buffer {
  const size =
    HEADER_SIZE +
    TRIANGLE_COUNT_SIZE +
    mesh.triangleCount * BYTES_PER_TRIANGLE;
  const buffer = Buffer.alloc(size);

  // Header (80 bytes of zeros/text)
  buffer.write("bambu-cli-mcp STL export", 0, "ascii");

  // Triangle count
  buffer.writeUInt32LE(mesh.triangleCount, HEADER_SIZE);

  let offset = HEADER_SIZE + TRIANGLE_COUNT_SIZE;

  for (let i = 0; i < mesh.triangleCount; i++) {
    // Normal
    buffer.writeFloatLE(mesh.normals[i * 3] ?? 0, offset);
    buffer.writeFloatLE(mesh.normals[i * 3 + 1] ?? 0, offset + 4);
    buffer.writeFloatLE(mesh.normals[i * 3 + 2] ?? 0, offset + 8);
    offset += 12;

    // 3 vertices
    for (let v = 0; v < 9; v++) {
      buffer.writeFloatLE(mesh.vertices[i * 9 + v], offset);
      offset += 4;
    }

    // Attribute byte count (0)
    buffer.writeUInt16LE(0, offset);
    offset += 2;
  }

  return buffer;
}

export async function writeStl(
  filePath: string,
  mesh: StlMesh,
): Promise<void> {
  const buffer = writeBinaryStl(mesh);
  await writeFile(filePath, buffer);
}

/**
 * Convert STL mesh (per-triangle vertices) to indexed mesh format
 * suitable for manifold-3d Mesh constructor.
 */
export function stlToIndexed(stl: StlMesh): {
  vertProperties: Float32Array;
  triVerts: Uint32Array;
} {
  const posMap = new Map<string, number>();
  const uniqueVerts: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < stl.triangleCount * 3; i++) {
    const x = stl.vertices[i * 3];
    const y = stl.vertices[i * 3 + 1];
    const z = stl.vertices[i * 3 + 2];
    const key = `${x},${y},${z}`;

    let idx = posMap.get(key);
    if (idx === undefined) {
      idx = uniqueVerts.length / 3;
      posMap.set(key, idx);
      uniqueVerts.push(x, y, z);
    }
    indices.push(idx);
  }

  return {
    vertProperties: new Float32Array(uniqueVerts),
    triVerts: new Uint32Array(indices),
  };
}

/**
 * Convert indexed mesh (from manifold-3d getMesh()) back to STL format.
 */
export function indexedToStl(
  vertProperties: Float32Array,
  triVerts: Uint32Array,
  numProp: number,
): StlMesh {
  const triangleCount = triVerts.length / 3;
  const vertices = new Float32Array(triangleCount * 9);
  const normals = new Float32Array(triangleCount * 3);

  for (let t = 0; t < triangleCount; t++) {
    const i0 = triVerts[t * 3];
    const i1 = triVerts[t * 3 + 1];
    const i2 = triVerts[t * 3 + 2];

    // Extract vertex positions
    const v0x = vertProperties[i0 * numProp];
    const v0y = vertProperties[i0 * numProp + 1];
    const v0z = vertProperties[i0 * numProp + 2];
    const v1x = vertProperties[i1 * numProp];
    const v1y = vertProperties[i1 * numProp + 1];
    const v1z = vertProperties[i1 * numProp + 2];
    const v2x = vertProperties[i2 * numProp];
    const v2y = vertProperties[i2 * numProp + 1];
    const v2z = vertProperties[i2 * numProp + 2];

    vertices[t * 9 + 0] = v0x;
    vertices[t * 9 + 1] = v0y;
    vertices[t * 9 + 2] = v0z;
    vertices[t * 9 + 3] = v1x;
    vertices[t * 9 + 4] = v1y;
    vertices[t * 9 + 5] = v1z;
    vertices[t * 9 + 6] = v2x;
    vertices[t * 9 + 7] = v2y;
    vertices[t * 9 + 8] = v2z;

    // Compute face normal via cross product
    const e1x = v1x - v0x;
    const e1y = v1y - v0y;
    const e1z = v1z - v0z;
    const e2x = v2x - v0x;
    const e2y = v2y - v0y;
    const e2z = v2z - v0z;

    let nx = e1y * e2z - e1z * e2y;
    let ny = e1z * e2x - e1x * e2z;
    let nz = e1x * e2y - e1y * e2x;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

    if (len > 0) {
      nx /= len;
      ny /= len;
      nz /= len;
    }

    normals[t * 3] = nx;
    normals[t * 3 + 1] = ny;
    normals[t * 3 + 2] = nz;
  }

  return { vertices, normals, triangleCount };
}
