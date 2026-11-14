import { z } from "zod";

const SlicerSettingsSchema = z
  .object({
    machine: z.string().optional().describe("Path to machine settings JSON"),
    process: z.string().optional().describe("Path to process settings JSON"),
    filaments: z.array(z.string()).optional().describe("Paths to filament settings JSONs"),
  })
  .optional()
  .describe("Optional BambuStudio machine/process/filament settings");

export const RepairAndSliceCrossServerSchema = z.object({
  input: z.string().describe("Path to input STL file"),
  outputDir: z.string().describe("Directory for the final sliced .3mf"),
  settings: SlicerSettingsSchema,
});

export const EstimateAndPackageSchema = z.object({
  files: z.array(z.string()).min(1).describe("Paths to input STL/OBJ files"),
  outputDir: z.string().describe("Directory for the final package"),
  settings: SlicerSettingsSchema,
});
