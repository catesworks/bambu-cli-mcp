import { describe, it, expect } from "vitest";
import {
  AddConnectorsSchema,
  GenerateAssemblyManifestSchema,
  MakePrintableLargeModelSchema,
  SplitWithConnectorsSchema,
} from "../../src/cad-geometry-mcp/schemas/tools.js";

const heatInsert = {
  type: "heat_insert",
  outerDiameterMm: 5,
  depthMm: 6,
  screwDiameterMm: 3,
  clearanceMm: 0.2,
  countPerSeam: 2,
};
const base = { input: "in.stl", buildVolume: [256, 256, 256], outputDir: "out" };

describe("connector schemas", () => {
  it("workflow tools accept a heat_insert connector", () => {
    expect(SplitWithConnectorsSchema.safeParse({ ...base, connector: heatInsert }).success).toBe(true);
    expect(
      MakePrintableLargeModelSchema.safeParse({ ...base, scale: 2, connector: heatInsert }).success,
    ).toBe(true);
  });

  it("rejects screwDiameterMm >= outerDiameterMm", () => {
    const bad = { ...heatInsert, screwDiameterMm: 5 };
    expect(SplitWithConnectorsSchema.safeParse({ ...base, connector: bad }).success).toBe(false);
  });

  it("add_dowel_connectors stays dowel-only", () => {
    const parsed = AddConnectorsSchema.safeParse({
      inputPartsDir: "parts",
      connector: heatInsert,
      outputDir: "out",
    });
    expect(parsed.success).toBe(false);
  });

  it("assembly manifest can record heat-insert hardware sizes", () => {
    const parsed = GenerateAssemblyManifestSchema.safeParse({
      parts: [{ id: "A", file: "a.stl" }],
      connectors: [{ seam: "A-B", type: "heat_insert", outerDiameterMm: 5, screwDiameterMm: 3, depthMm: 6 }],
      outputFile: "manifest.json",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.connectors?.[0]).toMatchObject({ outerDiameterMm: 5, screwDiameterMm: 3 });
  });
});
