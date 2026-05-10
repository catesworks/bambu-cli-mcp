import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { join } from "node:path";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { generateTestCubeStl } from "../helpers/generate-test-cube.js";
import { scaleMesh, splitMesh, inspectMesh } from "../../src/cad-geometry-mcp/engines/manifold-engine.js";
import { detectSeams, addDowelConnectors } from "../../src/cad-geometry-mcp/engines/connectors.js";

const testDir = join(tmpdir(), "bambu-mcp-connector-test");
const cubeStl = join(testDir, "cube.stl");
const splitDir = join(testDir, "split");
const connectorDir = join(testDir, "connected");

beforeAll(async () => {
  mkdirSync(testDir, { recursive: true });
  mkdirSync(splitDir, { recursive: true });
  mkdirSync(connectorDir, { recursive: true });
  writeFileSync(cubeStl, generateTestCubeStl());

  // Scale cube to 20x20x20 and split into parts
  const bigCube = join(testDir, "big_cube.stl");
  await scaleMesh(cubeStl, bigCube, 2);
  await splitMesh(bigCube, [10, 10, 10], splitDir);
});

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe("seam detection", () => {
  it("detects seams between split parts", async () => {
    const seams = await detectSeams(splitDir);
    expect(seams.length).toBeGreaterThan(0);

    for (const seam of seams) {
      expect(seam.partA).toBeTruthy();
      expect(seam.partB).toBeTruthy();
      expect(seam.plane.normal).toHaveLength(3);
      expect(seam.centroid).toHaveLength(3);
    }
  });
});

describe("dowel connectors", () => {
  it("adds dowel connectors to split parts", async () => {
    const result = await addDowelConnectors(splitDir, connectorDir, {
      type: "dowel",
      diameterMm: 6,
      depthMm: 10,
      clearanceMm: 0.2,
      countPerSeam: 2,
    });

    expect(result.parts.length).toBeGreaterThan(0);
    expect(result.connectors.length).toBeGreaterThan(0);

    // Each connector should have positions
    for (const conn of result.connectors) {
      expect(conn.positions.length).toBe(2);
      expect(conn.malePartId).toBeTruthy();
      expect(conn.femalePartId).toBeTruthy();
    }

    // Output parts should be valid meshes
    for (const part of result.parts) {
      const info = await inspectMesh(part.file);
      expect(info.triangleCount).toBeGreaterThan(12); // More triangles than original cube
    }
  });
});
