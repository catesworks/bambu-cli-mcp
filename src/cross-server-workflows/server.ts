import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { RepairAndSliceCrossServerSchema } from "./schemas.js";
import { repairAndSliceCrossServer } from "./repair-and-slice.js";

/** Workflows that need both tool families; registered only by --server both. */
export function registerCrossServerWorkflowTools(server: McpServer): void {
  server.tool(
    "repair_and_slice",
    "Cross-server pipeline: inspect -> repair -> convert to 3MF -> arrange -> orient -> slice. Requires --server both.",
    RepairAndSliceCrossServerSchema.shape,
    async (params) => repairAndSliceCrossServer(params),
  );
}
