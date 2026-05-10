import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  InspectMeshSchema,
  RepairMeshSchema,
  ScaleMeshSchema,
  SplitMeshSchema,
  LayFlatSchema,
  GenerateAssemblyManifestSchema,
  AddConnectorsSchema,
  MakePrintableLargeModelSchema,
  RepairAndSliceSchema,
  SplitWithConnectorsSchema,
  ListAvailableEnginesSchema,
} from "./schemas/tools.js";
import { inspectMeshTool } from "./tools/inspect-mesh.js";
import { repairMeshTool } from "./tools/repair-mesh.js";
import { scaleMeshTool } from "./tools/scale-mesh.js";
import { splitMeshTool } from "./tools/split-mesh.js";
import { layFlatTool } from "./tools/lay-flat.js";
import { generateAssemblyManifestTool } from "./tools/generate-assembly-manifest.js";
import { addConnectorsTool } from "./tools/add-connectors.js";
import {
  makePrintableLargeModel,
  repairAndSlice,
  splitWithConnectors,
  listAvailableEngines,
} from "./tools/workflows.js";

export function createCadGeometryServer(): McpServer {
  const server = new McpServer({
    name: "cad-geometry-mcp",
    version: "0.1.0",
  });

  registerCadGeometryTools(server);

  return server;
}

export function registerCadGeometryTools(server: McpServer): void {
  // --- Core tools ---

  server.tool(
    "inspect_mesh",
    "Inspect an STL mesh file: returns bounds, triangle count, volume, watertight status",
    InspectMeshSchema.shape,
    async (params) => inspectMeshTool(params),
  );

  server.tool(
    "repair_mesh",
    "Repair an STL mesh: fix normals, merge vertices, remove degenerate faces",
    RepairMeshSchema.shape,
    async (params) => repairMeshTool(params),
  );

  server.tool(
    "scale_mesh",
    "Scale an STL mesh by a uniform factor",
    ScaleMeshSchema.shape,
    async (params) => scaleMeshTool(params),
  );

  server.tool(
    "split_mesh",
    "Split an STL mesh into parts that fit within a build volume",
    SplitMeshSchema.shape,
    async (params) => splitMeshTool(params),
  );

  server.tool(
    "lay_flat",
    "Rotate an STL mesh so its largest flat face is on the build plate",
    LayFlatSchema.shape,
    async (params) => layFlatTool(params),
  );

  server.tool(
    "generate_assembly_manifest",
    "Generate a JSON assembly manifest describing parts, neighbors, and connectors",
    GenerateAssemblyManifestSchema.shape,
    async (params) => generateAssemblyManifestTool(params),
  );

  server.tool(
    "add_dowel_connectors",
    "Add dowel connectors (male protrusions + female holes) to split parts along their seams",
    AddConnectorsSchema.shape,
    async (params) => addConnectorsTool(params),
  );

  // --- Workflow tools ---

  server.tool(
    "make_printable_large_model",
    "Full pipeline: inspect → scale → repair → split → connectors → manifest. Takes a model too large for the printer and produces print-ready parts.",
    MakePrintableLargeModelSchema.shape,
    async (params) => makePrintableLargeModel(params),
  );

  server.tool(
    "repair_and_prepare",
    "Pipeline: inspect → repair → lay flat. Prepares a mesh for printing by repairing issues and orienting for the build plate.",
    RepairAndSliceSchema.shape,
    async (params) => repairAndSlice(params),
  );

  server.tool(
    "split_with_connectors",
    "Pipeline: split → add connectors → manifest. Splits a model and adds alignment connectors at seams.",
    SplitWithConnectorsSchema.shape,
    async (params) => splitWithConnectors(params),
  );

  server.tool(
    "list_available_engines",
    "List available CAD/geometry engines (manifold, FreeCAD, Blender, Fusion) and their status",
    ListAvailableEnginesSchema.shape,
    async () => listAvailableEngines(),
  );
}
