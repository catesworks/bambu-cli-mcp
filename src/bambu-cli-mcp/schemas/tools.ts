import { z } from "zod";

export const InspectBambuCliSchema = z.object({}).describe("No parameters required");

export const ExportSettingsSchema = z.object({
  project: z.string().optional().describe("Path to .3mf project file"),
});

export const ConvertTo3mfSchema = z.object({
  files: z.array(z.string()).min(1).describe("Paths to STL/OBJ files to convert"),
  output: z.string().optional().describe("Output .3mf filename (default: output.3mf)"),
});

export const ArrangeProjectSchema = z.object({
  project: z.string().describe("Path to .3mf project file"),
  allowRotations: z.boolean().default(true).describe("Allow rotations during arrangement"),
  ensureOnBed: z.boolean().default(true).describe("Ensure objects are on the bed"),
});

export const OrientProjectSchema = z.object({
  project: z.string().describe("Path to .3mf project file"),
});

export const SliceProjectSchema = z.object({
  project: z.string().describe("Path to .3mf project file"),
  plate: z.number().int().min(0).default(0).describe("Plate to slice: 0=all, i=specific plate"),
  settings: z
    .object({
      machine: z.string().optional().describe("Path to machine settings JSON"),
      process: z.string().optional().describe("Path to process settings JSON"),
      filaments: z.array(z.string()).optional().describe("Paths to filament settings JSONs"),
    })
    .optional()
    .describe("Override settings"),
  output: z.string().optional().describe("Output .3mf filename"),
});

export const ExportPlatePngSchema = z.object({
  project: z.string().describe("Path to .3mf project file"),
  plate: z.number().int().min(0).default(0).describe("Plate to export: 0=all, i=specific plate"),
  cameraView: z
    .number()
    .int()
    .min(0)
    .max(12)
    .default(0)
    .describe("Camera angle: 0=Iso, 1=Top_Front, 2=Left, 3=Right, 10-12=Iso variants"),
});

export const ExportStlsSchema = z.object({
  project: z.string().describe("Path to .3mf project file"),
});

export const ValidateProjectSchema = z.object({
  project: z.string().describe("Path to .3mf project file"),
});

export const EstimatePrintSchema = z.object({
  project: z.string().describe("Path to .3mf project file"),
  settings: z
    .object({
      machine: z.string().optional().describe("Path to machine settings JSON"),
      process: z.string().optional().describe("Path to process settings JSON"),
      filaments: z.array(z.string()).optional().describe("Paths to filament settings JSONs"),
    })
    .optional()
    .describe("Override settings for estimation"),
});

export const CreatePrintPackageSchema = z.object({
  files: z.array(z.string()).min(1).describe("Paths to STL files"),
  settings: z
    .object({
      machine: z.string().optional(),
      process: z.string().optional(),
      filaments: z.array(z.string()).optional(),
    })
    .optional()
    .describe("Slicing settings"),
  arrange: z.boolean().default(true).describe("Auto-arrange parts"),
  orient: z.boolean().default(true).describe("Auto-orient parts"),
  ensureOnBed: z.boolean().default(true),
  output: z.string().optional().describe("Output .3mf filename"),
});
