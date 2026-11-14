import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { join } from "node:path";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { generateTestCubeStl } from "../helpers/generate-test-cube.js";
import { makeFakes } from "./fake-bambu-tools.js";

const testDir = join(tmpdir(), "bambu-mcp-repair-and-slice-test");
const cubeStl = join(testDir, "cube.stl");
const fakes = vi.hoisted(() => ({ current: null as ReturnType<typeof makeFakes> | null }));

vi.mock("../../src/bambu-cli-mcp/tools/convert-to-3mf.js", () => ({
  convertTo3mf: (p: unknown) => fakes.current!.convertTo3mf(p),
}));
vi.mock("../../src/bambu-cli-mcp/tools/arrange-project.js", () => ({
  arrangeProject: (p: unknown) => fakes.current!.arrangeProject(p),
}));
vi.mock("../../src/bambu-cli-mcp/tools/orient-project.js", () => ({
  orientProject: (p: unknown) => fakes.current!.orientProject(p),
}));
vi.mock("../../src/bambu-cli-mcp/tools/slice-project.js", () => ({
  sliceProject: (p: unknown) => fakes.current!.sliceProject(p),
}));

import { repairAndSliceCrossServer } from "../../src/cross-server-workflows/repair-and-slice.js";

beforeAll(() => {
  mkdirSync(testDir, { recursive: true });
  writeFileSync(cubeStl, generateTestCubeStl());
});
afterAll(() => rmSync(testDir, { recursive: true, force: true }));
beforeEach(() => {
  fakes.current = makeFakes(join(testDir, "bambu-work"));
});

describe("repairAndSliceCrossServer", () => {
  it("runs inspect -> repair -> convert -> arrange -> orient -> slice and copies the result", async () => {
    const outputDir = join(testDir, "out");
    const settings = { machine: "m.json" };
    const result = await repairAndSliceCrossServer({ input: cubeStl, outputDir, settings });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.pipeline).toEqual(["inspect", "repair", "convert_to_3mf", "arrange", "orient", "slice"]);
    expect(fakes.current!.calls).toEqual(["convert", "arrange", "orient", "slice"]);
    expect(parsed.slicedProject).toBe(join(outputDir, "sliced.3mf"));
    expect(existsSync(parsed.slicedProject)).toBe(true);
    expect(parsed.originalInfo.watertight).toBe(true);
    expect(parsed.repair.watertightAfter).toBe(true);
    expect(fakes.current!.sliceProject).toHaveBeenCalledWith(
      expect.objectContaining({ project: join(testDir, "bambu-work", "oriented.3mf"), settings }),
    );
  });

  it("stops at the first failing step and returns its error", async () => {
    fakes.current!.failAt.add("arrange");
    const result = await repairAndSliceCrossServer({ input: cubeStl, outputDir: join(testDir, "out-fail") });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("arrange failed");
    expect(fakes.current!.calls).toEqual(["convert", "arrange"]);
  });

  it("returns an error and calls no Bambu tool when the input is missing", async () => {
    const result = await repairAndSliceCrossServer({
      input: join(testDir, "does-not-exist.stl"),
      outputDir: join(testDir, "out-missing"),
    });
    expect(result.isError).toBe(true);
    expect(fakes.current!.calls).toEqual([]);
  });
});
