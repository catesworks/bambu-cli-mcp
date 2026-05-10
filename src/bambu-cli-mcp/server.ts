import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  InspectBambuCliSchema,
  ExportSettingsSchema,
  ConvertTo3mfSchema,
  ArrangeProjectSchema,
  OrientProjectSchema,
  SliceProjectSchema,
  ExportPlatePngSchema,
  ExportStlsSchema,
  ValidateProjectSchema,
  EstimatePrintSchema,
  CreatePrintPackageSchema,
} from "./schemas/tools.js";
import { inspectBambuCli } from "./tools/inspect-bambu-cli.js";
import { exportSettings } from "./tools/export-settings.js";
import { convertTo3mf } from "./tools/convert-to-3mf.js";
import { arrangeProject } from "./tools/arrange-project.js";
import { orientProject } from "./tools/orient-project.js";
import { sliceProject } from "./tools/slice-project.js";
import { exportPlatePng } from "./tools/export-plate-png.js";
import { exportStls } from "./tools/export-stls.js";
import { validateProject } from "./tools/validate-project.js";
import { estimatePrint } from "./tools/estimate-print.js";
import { createPrintPackage } from "./tools/create-print-package.js";

export function createBambuCliServer(): McpServer {
  const server = new McpServer({
    name: "bambu-cli-mcp",
    version: "0.1.0",
  });

  server.tool(
    "inspect_bambu_cli",
    "Returns BambuStudio CLI version, path, and available flags",
    InspectBambuCliSchema.shape,
    async () => inspectBambuCli(),
  );

  server.tool(
    "export_settings",
    "Export BambuStudio settings to JSON. Optionally reads settings from an existing .3mf project.",
    ExportSettingsSchema.shape,
    async (params) => exportSettings(params),
  );

  server.tool(
    "convert_to_3mf",
    "Convert one or more STL/OBJ files into a .3mf project file",
    ConvertTo3mfSchema.shape,
    async (params) => convertTo3mf(params),
  );

  server.tool(
    "arrange_project",
    "Auto-arrange objects on the build plate in a .3mf project",
    ArrangeProjectSchema.shape,
    async (params) => arrangeProject(params),
  );

  server.tool(
    "orient_project",
    "Auto-orient objects for optimal printing in a .3mf project",
    OrientProjectSchema.shape,
    async (params) => orientProject(params),
  );

  server.tool(
    "slice_project",
    "Slice a .3mf project with specified settings and export the sliced result",
    SliceProjectSchema.shape,
    async (params) => sliceProject(params),
  );

  server.tool(
    "export_plate_png",
    "Export PNG preview images of plates from a .3mf project",
    ExportPlatePngSchema.shape,
    async (params) => exportPlatePng(params),
  );

  server.tool(
    "export_stls",
    "Export objects from a .3mf project as individual STL files",
    ExportStlsSchema.shape,
    async (params) => exportStls(params),
  );

  server.tool(
    "validate_project",
    "Validate a .3mf project file and report model information, warnings, and errors",
    ValidateProjectSchema.shape,
    async (params) => validateProject(params),
  );

  server.tool(
    "estimate_print",
    "Estimate print time and filament usage for a .3mf project",
    EstimatePrintSchema.shape,
    async (params) => estimatePrint(params),
  );

  server.tool(
    "create_print_package",
    "Full pipeline: convert STLs to 3MF, arrange, orient, slice, and export PNG previews",
    CreatePrintPackageSchema.shape,
    async (params) => createPrintPackage(params),
  );

  return server;
}
