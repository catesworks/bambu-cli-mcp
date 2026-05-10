import { inspectMesh } from "../engines/manifold-engine.js";
import { handleToolError } from "../../shared/errors.js";
import { toolResult } from "../../shared/types.js";

export async function inspectMeshTool(params: { path: string }) {
  try {
    const info = await inspectMesh(params.path);
    return toolResult(info);
  } catch (error) {
    return handleToolError(error);
  }
}
