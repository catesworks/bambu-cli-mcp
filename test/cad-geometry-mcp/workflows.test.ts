import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { join } from "node:path";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { generateTestCubeStl } from "../helpers/generate-test-cube.js";
import {
  makePrintableLargeModel,
  repairAndSlice,
  splitWithConnectors,
  listAvailableEngines,
} from "../../src/cad-geometry-mcp/tools/workflows.js";

const testDir = join(tmpdir(), "bambu-mcp-workflow-test");
const cubeStl = join(testDir, "cube.stl");

beforeAll(() => {
  mkdirSync(testDir, { recursive: true });
  writeFileSync(cubeStl, generateTestCubeStl());
});

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe("workflow tools", () => {
  describe("makePrintableLargeModel", () => {
    it("runs full pipeline: scale → repair → split → connectors", async () => {
      const outputDir = join(testDir, "printable_output");
      const result = await makePrintableLargeModel({
        input: cubeStl,
        scale: 2,
        buildVolume: [10, 10, 10],
        connector: {
          type: "dowel",
          diameterMm: 4,
          depthMm: 8,
          clearanceMm: 0.2,
          countPerSeam: 1,
        },
        outputDir,
      });

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.totalParts).toBeGreaterThan(1);
      expect(data.pipeline).toContain("inspect");
      expect(data.pipeline).toContain("scale");
      expect(data.pipeline).toContain("repair");
      expect(data.pipeline).toContain("split");
      expect(data.pipeline).toContain("connectors");
      expect(existsSync(data.manifest)).toBe(true);
    });
  });

  describe("repairAndSlice", () => {
    it("repairs and lays flat", async () => {
      const outputDir = join(testDir, "repair_output");
      const result = await repairAndSlice({
        input: cubeStl,
        outputDir,
      });

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.output).toContain("repaired.stl");
      expect(data.pipeline).toContain("inspect");
      expect(data.pipeline).toContain("repair");
      expect(data.pipeline).toContain("lay_flat");
      expect(existsSync(data.output)).toBe(true);
    });
  });

  describe("splitWithConnectors", () => {
    it("splits and adds connectors", async () => {
      const outputDir = join(testDir, "split_conn_output");
      const result = await splitWithConnectors({
        input: cubeStl,
        buildVolume: [6, 6, 6],
        connector: {
          type: "dowel",
          diameterMm: 3,
          depthMm: 5,
          clearanceMm: 0.2,
          countPerSeam: 1,
        },
        outputDir,
      });

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.totalParts).toBeGreaterThan(1);
      expect(data.pipeline).toContain("split");
      expect(existsSync(data.manifest)).toBe(true);
    });
  });

  describe("listAvailableEngines", () => {
    it("returns manifold as always available", async () => {
      const result = await listAvailableEngines();

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      const manifold = data.engines.find(
        (e: { engine: string }) => e.engine === "manifold",
      );
      expect(manifold).toBeDefined();
      expect(manifold.available).toBe(true);
    });
  });
});
