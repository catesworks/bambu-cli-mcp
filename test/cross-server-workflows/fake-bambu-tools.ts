// Fakes for the bambu-cli-mcp tool functions so cross-server workflows can be
// tested without a BambuStudio install. Each fake writes a real file at the
// path it returns, so later steps can copy it.
import { vi } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { toolResult, toolError } from "../../src/shared/types.js";

export function makeFakes(workDir: string) {
  const calls: string[] = [];
  const failAt = new Set<string>();
  const file = (name: string) => {
    mkdirSync(workDir, { recursive: true });
    const p = join(workDir, name);
    writeFileSync(p, name);
    return p;
  };
  const step =
    (name: string, data: () => Record<string, unknown>) =>
    vi.fn(async (_params: unknown) => {
      calls.push(name);
      return failAt.has(name) ? toolError(`${name} failed`) : toolResult(data());
    });
  return {
    calls,
    failAt,
    convertTo3mf: step("convert", () => ({ output: file("converted.3mf") })),
    arrangeProject: step("arrange", () => ({ output: file("arranged.3mf") })),
    orientProject: step("orient", () => ({ output: file("oriented.3mf") })),
    sliceProject: step("slice", () => ({ output: file("sliced.3mf"), plate: 0 })),
    estimatePrint: step("estimate", () => ({
      output: join(workDir, "deleted-by-estimate-print", "estimate.3mf"),
      rawOutput: "",
      estimatedTimeMinutes: 42,
      filamentUsageGrams: 12.5,
    })),
    exportPlatePng: step("export_png", () => ({ images: [file("plate_1.png")], plate: 0, cameraView: 0 })),
  };
}
