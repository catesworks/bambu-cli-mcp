import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { join } from "node:path";
import { mkdirSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { makeFakes } from "./fake-bambu-tools.js";

const testDir = join(tmpdir(), "bambu-mcp-estimate-and-package-test");
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
vi.mock("../../src/bambu-cli-mcp/tools/estimate-print.js", () => ({
  estimatePrint: (p: unknown) => fakes.current!.estimatePrint(p),
}));
vi.mock("../../src/bambu-cli-mcp/tools/slice-project.js", () => ({
  sliceProject: (p: unknown) => fakes.current!.sliceProject(p),
}));
vi.mock("../../src/bambu-cli-mcp/tools/export-plate-png.js", () => ({
  exportPlatePng: (p: unknown) => fakes.current!.exportPlatePng(p),
}));

import { estimateAndPackage } from "../../src/cross-server-workflows/estimate-and-package.js";

const files = ["/models/a.stl", "/models/b.stl"];

beforeAll(() => mkdirSync(testDir, { recursive: true }));
afterAll(() => rmSync(testDir, { recursive: true, force: true }));
beforeEach(() => {
  fakes.current = makeFakes(join(testDir, "bambu-work"));
});

describe("estimateAndPackage", () => {
  it("writes a package with the sliced project, previews and a manifest", async () => {
    const outputDir = join(testDir, "pkg");
    const result = await estimateAndPackage({ files, outputDir });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.pipeline).toEqual(["convert_to_3mf", "arrange", "orient", "estimate", "slice", "export_png", "package"]);
    expect(fakes.current!.calls).toEqual(["convert", "arrange", "orient", "estimate", "slice", "export_png"]);
    expect(parsed.manifest).toBe(join(outputDir, "manifest.json"));

    const manifest = JSON.parse(readFileSync(parsed.manifest, "utf-8"));
    expect(manifest).toEqual({
      files,
      estimatedTimeMinutes: 42,
      filamentUsageGrams: 12.5,
      slicedProject: join(outputDir, "package.3mf"),
      previews: [join(outputDir, "plate_1.png")],
    });
    expect(existsSync(manifest.slicedProject)).toBe(true);
    expect(existsSync(manifest.previews[0])).toBe(true);
  });

  it("treats PNG export failure as non-fatal", async () => {
    fakes.current!.failAt.add("export_png");
    const result = await estimateAndPackage({ files, outputDir: join(testDir, "pkg-nopng") });
    expect(result.isError).toBeUndefined();
    const manifest = JSON.parse(readFileSync(JSON.parse(result.content[0].text).manifest, "utf-8"));
    expect(manifest.previews).toEqual([]);
  });

  it.each(["estimate", "slice"])("aborts when %s fails", async (failing) => {
    fakes.current!.failAt.add(failing);
    const outputDir = join(testDir, `pkg-fail-${failing}`);
    const result = await estimateAndPackage({ files, outputDir });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain(`${failing} failed`);
    expect(existsSync(join(outputDir, "manifest.json"))).toBe(false);
  });
});
