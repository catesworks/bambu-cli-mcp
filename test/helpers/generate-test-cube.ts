/**
 * Generates a binary STL file for a 10x10x10mm cube centered at origin.
 * Used as test fixture.
 */

const HEADER_SIZE = 80;
const TRIANGLE_COUNT_SIZE = 4;
const BYTES_PER_TRIANGLE = 50;

// 12 triangles (2 per face, 6 faces)
const triangles = [
  // Front face (z=5)
  { n: [0, 0, 1], v: [[-5, -5, 5], [5, -5, 5], [5, 5, 5]] },
  { n: [0, 0, 1], v: [[-5, -5, 5], [5, 5, 5], [-5, 5, 5]] },
  // Back face (z=-5)
  { n: [0, 0, -1], v: [[5, -5, -5], [-5, -5, -5], [-5, 5, -5]] },
  { n: [0, 0, -1], v: [[5, -5, -5], [-5, 5, -5], [5, 5, -5]] },
  // Right face (x=5)
  { n: [1, 0, 0], v: [[5, -5, -5], [5, 5, -5], [5, 5, 5]] },
  { n: [1, 0, 0], v: [[5, -5, -5], [5, 5, 5], [5, -5, 5]] },
  // Left face (x=-5)
  { n: [-1, 0, 0], v: [[-5, -5, -5], [-5, -5, 5], [-5, 5, 5]] },
  { n: [-1, 0, 0], v: [[-5, -5, -5], [-5, 5, 5], [-5, 5, -5]] },
  // Top face (y=5)
  { n: [0, 1, 0], v: [[-5, 5, -5], [-5, 5, 5], [5, 5, 5]] },
  { n: [0, 1, 0], v: [[-5, 5, -5], [5, 5, 5], [5, 5, -5]] },
  // Bottom face (y=-5)
  { n: [0, -1, 0], v: [[-5, -5, -5], [5, -5, -5], [5, -5, 5]] },
  { n: [0, -1, 0], v: [[-5, -5, -5], [5, -5, 5], [-5, -5, 5]] },
];

export function generateTestCubeStl(): Buffer {
  const triCount = triangles.length;
  const size = HEADER_SIZE + TRIANGLE_COUNT_SIZE + triCount * BYTES_PER_TRIANGLE;
  const buffer = Buffer.alloc(size);

  buffer.write("test-cube 10x10x10mm", 0, "ascii");
  buffer.writeUInt32LE(triCount, HEADER_SIZE);

  let offset = HEADER_SIZE + TRIANGLE_COUNT_SIZE;

  for (const tri of triangles) {
    // Normal
    buffer.writeFloatLE(tri.n[0], offset);
    buffer.writeFloatLE(tri.n[1], offset + 4);
    buffer.writeFloatLE(tri.n[2], offset + 8);
    offset += 12;

    // 3 vertices
    for (const v of tri.v) {
      buffer.writeFloatLE(v[0], offset);
      buffer.writeFloatLE(v[1], offset + 4);
      buffer.writeFloatLE(v[2], offset + 8);
      offset += 12;
    }

    // Attribute
    buffer.writeUInt16LE(0, offset);
    offset += 2;
  }

  return buffer;
}
