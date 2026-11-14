import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { join } from "node:path";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { generateTestCubeStl } from "../helpers/generate-test-cube.js";
import { scaleMesh, splitMesh, inspectMesh } from "../../src/cad-geometry-mcp/engines/manifold-engine.js";
import { detectSeams, addDowelConnectors, addConnectors, addHeatInsertConnectors } from "../../src/cad-geometry-mcp/engines/connectors.js";

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

describe("addConnectors dispatcher", () => {
  it("routes the dowel type to the same result addDowelConnectors produces", async () => {
    const spec = {
      type: "dowel" as const,
      diameterMm: 4,
      depthMm: 8,
      clearanceMm: 0.2,
      countPerSeam: 1,
    };
    const directDir = join(testDir, "direct");
    const dispatchedDir = join(testDir, "dispatched");
    mkdirSync(directDir, { recursive: true });
    mkdirSync(dispatchedDir, { recursive: true });
    const direct = await addDowelConnectors(splitDir, directDir, spec);
    const dispatched = await addConnectors(splitDir, dispatchedDir, spec);
    expect(dispatched.connectors.length).toBe(direct.connectors.length);
    expect(dispatched.parts.length).toBe(direct.parts.length);
  });
});

describe("heat-insert connectors", () => {
  const spec = {
    type: "heat_insert" as const,
    outerDiameterMm: 5,
    depthMm: 6,
    screwDiameterMm: 3,
    clearanceMm: 0.2,
    countPerSeam: 1,
  };
  // Two 10x20x20 parts with one seam, so each part gets exactly one cut and
  // cuts from different faces cannot meet inside a part.
  const pairDir = join(testDir, "pair");

  beforeAll(async () => {
    mkdirSync(pairDir, { recursive: true });
    const bigCube = join(testDir, "pair_cube.stl");
    await scaleMesh(cubeStl, bigCube, 2);
    await splitMesh(bigCube, [10, 20, 20], pairDir);
  });

  async function volumes(files: string[]) {
    const out = new Map<string, number>();
    for (const file of files) out.set(file.split("/").pop()!, (await inspectMesh(file)).volume);
    return out;
  }

  it("cuts a pocket into part A and a hole through part B at each seam", async () => {
    const outDir = join(testDir, "heat_insert");
    mkdirSync(outDir, { recursive: true });
    const { readdirSync } = await import("node:fs");
    const inputFiles = readdirSync(pairDir).filter((f) => f.endsWith(".stl")).map((f) => join(pairDir, f));
    expect(inputFiles).toHaveLength(2);
    const before = await volumes(inputFiles);

    const result = await addHeatInsertConnectors(pairDir, outDir, spec);
    expect(result.connectors).toHaveLength(1);
    expect(result.connectors[0].type).toBe("heat_insert");

    const after = await volumes(result.parts.map((p) => p.file));
    // Every part that is side A or side B of a seam must lose material.
    const touched = new Set(result.connectors.flatMap((c) => [c.malePartId, c.femalePartId]));
    for (const id of touched) {
      const name = `part_${id}.stl`;
      expect(after.get(name)!).toBeLessThan(before.get(name)! - 1);
    }

    // Each screw hole fully penetrates part B, adding one handle (genus +1);
    // blind pockets do not change genus. So genus == screw holes received.
    for (const part of result.parts) {
      const holes = result.connectors
        .filter((c) => c.femalePartId === part.id)
        .reduce((n, c) => n + c.positions.length, 0);
      expect((await inspectMesh(part.file)).genus).toBe(holes);
    }
  });

  it("dispatches heat_insert through addConnectors", async () => {
    const outDir = join(testDir, "heat_insert_dispatched");
    mkdirSync(outDir, { recursive: true });
    const result = await addConnectors(splitDir, outDir, spec);
    expect(result.connectors[0].type).toBe("heat_insert");
  });

  it("rejects screwDiameterMm >= outerDiameterMm in the engine", async () => {
    await expect(
      addHeatInsertConnectors(splitDir, join(testDir, "heat_insert_invalid"), {
        ...spec,
        screwDiameterMm: 5,
      }),
    ).rejects.toThrow(/screwDiameterMm must be smaller than outerDiameterMm/);
  });
});
