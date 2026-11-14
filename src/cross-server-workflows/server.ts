import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { EstimateAndPackageSchema, RepairAndSliceCrossServerSchema } from "./schemas.js";
import { repairAndSliceCrossServer } from "./repair-and-slice.js";
import { estimateAndPackage } from "./estimate-and-package.js";

/** Workflows that need both tool families; registered only by --server both. */
export function registerCrossServerWorkflowTools(server: McpServer): void {
  server.tool(
    "repair_and_slice",
    "Cross-server pipeline: inspect -> repair -> convert to 3MF -> arrange -> orient -> slice. Requires --server both.",
    RepairAndSliceCrossServerSchema.shape,
    async (params) => repairAndSliceCrossServer(params),
  );

  server.tool(
    "estimate_and_package",
    "Cross-server pipeline: convert -> arrange -> orient -> estimate -> slice -> export PNGs -> package (sliced .3mf, previews, manifest.json). Requires --server both.",
    EstimateAndPackageSchema.shape,
    async (params) => estimateAndPackage(params),
  );
}
