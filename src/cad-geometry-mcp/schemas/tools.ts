import { z } from "zod";

export const InspectMeshSchema = z.object({
  path: z.string().describe("Path to STL file to inspect"),
});

export const RepairMeshSchema = z.object({
  input: z.string().describe("Path to input STL file"),
  output: z.string().describe("Path for repaired output STL"),
});

export const ScaleMeshSchema = z.object({
  input: z.string().describe("Path to input STL file"),
  scale: z.number().positive().describe("Scale factor (e.g. 2 = double size)"),
  output: z.string().describe("Path for scaled output STL"),
});

export const SplitMeshSchema = z.object({
  input: z.string().describe("Path to input STL file"),
  buildVolume: z
    .tuple([z.number(), z.number(), z.number()])
    .describe("Build volume [x, y, z] in mm"),
  strategy: z
    .enum(["min_parts", "grid"])
    .default("min_parts")
    .describe("Splitting strategy"),
  outputDir: z.string().describe("Directory for split part STL files"),
});

export const LayFlatSchema = z.object({
  input: z.string().describe("Path to input STL file"),
  output: z.string().describe("Path for lay-flat output STL"),
});

export const GenerateAssemblyManifestSchema = z.object({
  parts: z
    .array(
      z.object({
        id: z.string(),
        file: z.string(),
        neighbors: z.array(z.string()).optional(),
      }),
    )
    .describe("List of parts with IDs and file paths"),
  project: z.string().optional().describe("Project name"),
  printer: z.string().optional().describe("Printer model"),
  scale: z.number().optional().describe("Scale factor used"),
  connectors: z
    .array(
      z.object({
        seam: z.string(),
        type: z.string(),
        diameterMm: z.number().optional(),
        depthMm: z.number().optional(),
        clearanceMm: z.number().optional(),
        count: z.number().optional(),
      }),
    )
    .optional()
    .describe("Connector specifications"),
  outputFile: z.string().describe("Path for output manifest JSON"),
});

export const AddConnectorsSchema = z.object({
  inputPartsDir: z
    .string()
    .describe("Directory containing split part STL files"),
  connector: z.object({
    type: z.literal("dowel").describe("Connector type"),
    diameterMm: z.number().positive().describe("Dowel diameter in mm"),
    depthMm: z.number().positive().describe("Dowel depth in mm"),
    clearanceMm: z
      .number()
      .positive()
      .describe("Clearance for female side in mm"),
    countPerSeam: z
      .number()
      .int()
      .positive()
      .describe("Number of connectors per seam"),
  }),
  outputDir: z.string().describe("Directory for output parts with connectors"),
});

export const MakePrintableLargeModelSchema = z.object({
  input: z.string().describe("Path to input STL file"),
  scale: z.number().positive().describe("Scale factor"),
  buildVolume: z
    .tuple([z.number(), z.number(), z.number()])
    .describe("Printer build volume [x, y, z] in mm"),
  connector: z
    .object({
      type: z.literal("dowel"),
      diameterMm: z.number().positive(),
      depthMm: z.number().positive(),
      clearanceMm: z.number().positive(),
      countPerSeam: z.number().int().positive(),
    })
    .optional()
    .describe("Connector spec (omit to skip connectors)"),
  outputDir: z.string().describe("Directory for output files"),
});

export const RepairAndSliceSchema = z.object({
  input: z.string().describe("Path to input STL file"),
  outputDir: z.string().describe("Directory for output files"),
});

export const SplitWithConnectorsSchema = z.object({
  input: z.string().describe("Path to input STL file"),
  buildVolume: z
    .tuple([z.number(), z.number(), z.number()])
    .describe("Build volume [x, y, z] in mm"),
  connector: z.object({
    type: z.literal("dowel"),
    diameterMm: z.number().positive(),
    depthMm: z.number().positive(),
    clearanceMm: z.number().positive(),
    countPerSeam: z.number().int().positive(),
  }),
  outputDir: z.string().describe("Directory for output files"),
});

export const ListAvailableEnginesSchema = z
  .object({})
  .describe("No parameters required");
