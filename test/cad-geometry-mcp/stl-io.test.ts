import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { join } from "node:path";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { generateTestCubeStl } from "../helpers/generate-test-cube.js";
import {
  readStl,
  writeBinaryStl,
  stlToIndexed,
  indexedToStl,
} from "../../src/cad-geometry-mcp/engines/stl-io.js";

const testDir = join(tmpdir(), "bambu-mcp-stl-test");
const cubeStl = join(testDir, "cube.stl");

beforeAll(() => {
  mkdirSync(testDir, { recursive: true });
  writeFileSync(cubeStl, generateTestCubeStl());
});

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe("STL I/O", () => {
  it("reads a binary STL file", async () => {
    const mesh = await readStl(cubeStl);
    expect(mesh.triangleCount).toBe(12);
    expect(mesh.vertices.length).toBe(12 * 9); // 12 triangles * 3 verts * 3 coords
    expect(mesh.normals.length).toBe(12 * 3);
  });

  it("round-trips binary STL write/read", async () => {
    const original = await readStl(cubeStl);
    const buffer = writeBinaryStl(original);
    const outPath = join(testDir, "cube_roundtrip.stl");
    writeFileSync(outPath, buffer);

    const roundTripped = await readStl(outPath);
    expect(roundTripped.triangleCount).toBe(original.triangleCount);
    expect(roundTripped.vertices.length).toBe(original.vertices.length);
  });

  it("converts to indexed format", async () => {
    const mesh = await readStl(cubeStl);
    const { vertProperties, triVerts } = stlToIndexed(mesh);

    // Cube has 8 unique vertices
    expect(vertProperties.length / 3).toBe(8);
    // 12 triangles * 3 indices
    expect(triVerts.length).toBe(36);
  });

  it("converts indexed back to STL format", async () => {
    const mesh = await readStl(cubeStl);
    const { vertProperties, triVerts } = stlToIndexed(mesh);
    const stl = indexedToStl(vertProperties, triVerts, 3);

    expect(stl.triangleCount).toBe(12);
    expect(stl.vertices.length).toBe(12 * 9);
    expect(stl.normals.length).toBe(12 * 3);
  });
});
