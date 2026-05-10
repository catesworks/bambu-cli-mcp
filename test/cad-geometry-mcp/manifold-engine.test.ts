import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { join } from "node:path";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { generateTestCubeStl } from "../helpers/generate-test-cube.js";
import {
  inspectMesh,
  repairMesh,
  scaleMesh,
  splitMesh,
  layFlat,
} from "../../src/cad-geometry-mcp/engines/manifold-engine.js";

const testDir = join(tmpdir(), "bambu-mcp-manifold-test");
const cubeStl = join(testDir, "cube.stl");

beforeAll(() => {
  mkdirSync(testDir, { recursive: true });
  writeFileSync(cubeStl, generateTestCubeStl());
});

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe("manifold engine", () => {
  describe("inspectMesh", () => {
    it("returns correct info for a 10x10x10 cube", async () => {
      const info = await inspectMesh(cubeStl);

      expect(info.triangleCount).toBe(12);
      expect(info.vertexCount).toBe(8);
      expect(info.units).toBe("mm");

      // Bounds should be roughly -5 to 5 on each axis (size ~10)
      const size = info.bounds.size;
      expect(size[0]).toBeCloseTo(10, 0);
      expect(size[1]).toBeCloseTo(10, 0);
      expect(size[2]).toBeCloseTo(10, 0);

      // Volume of 10x10x10 cube = 1000
      expect(info.volume).toBeCloseTo(1000, 0);
    });
  });

  describe("repairMesh", () => {
    it("repairs and outputs a valid mesh", async () => {
      const outputPath = join(testDir, "cube_repaired.stl");
      const result = await repairMesh(cubeStl, outputPath);

      expect(result.output).toBe(outputPath);
      expect(result.trianglesAfter).toBeGreaterThan(0);
    });
  });

  describe("scaleMesh", () => {
    it("scales a cube by factor 2", async () => {
      const outputPath = join(testDir, "cube_scaled.stl");
      const result = await scaleMesh(cubeStl, outputPath, 2);

      expect(result.scaleFactor).toBe(2);
      // Original size ~10, scaled should be ~20
      expect(result.newBounds.size[0]).toBeCloseTo(20, 0);
      expect(result.newBounds.size[1]).toBeCloseTo(20, 0);
      expect(result.newBounds.size[2]).toBeCloseTo(20, 0);

      // Verify the output can be inspected
      const info = await inspectMesh(outputPath);
      expect(info.volume).toBeCloseTo(8000, 0); // 2^3 * 1000
    });
  });

  describe("splitMesh", () => {
    it("returns 1 part when model fits build volume", async () => {
      const splitDir = join(testDir, "split_fits");
      mkdirSync(splitDir, { recursive: true });

      const result = await splitMesh(cubeStl, [256, 256, 256], splitDir);
      expect(result.totalParts).toBe(1);
      expect(result.parts[0].fitsVolume).toBe(true);
    });

    it("splits into multiple parts when model exceeds build volume", async () => {
      // Scale cube to 20x20x20, then split with 10x10x10 volume
      const bigCubePath = join(testDir, "big_cube.stl");
      await scaleMesh(cubeStl, bigCubePath, 2);

      const splitDir = join(testDir, "split_multi");
      mkdirSync(splitDir, { recursive: true });

      const result = await splitMesh(bigCubePath, [10, 10, 10], splitDir);
      expect(result.totalParts).toBeGreaterThan(1);

      // Each part should fit the build volume
      for (const part of result.parts) {
        expect(part.fitsVolume).toBe(true);
      }
    });
  });

  describe("layFlat", () => {
    it("produces output with z-min at 0", async () => {
      const outputPath = join(testDir, "cube_flat.stl");
      const result = await layFlat(cubeStl, outputPath);

      expect(result.output).toBe(outputPath);

      const info = await inspectMesh(outputPath);
      // After lay flat, min Z should be at or near 0
      expect(info.bounds.min[2]).toBeCloseTo(0, 0);
    });
  });
});
