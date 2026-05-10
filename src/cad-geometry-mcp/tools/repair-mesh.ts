import { repairMesh } from "../engines/manifold-engine.js";
import { handleToolError } from "../../shared/errors.js";
import { toolResult } from "../../shared/types.js";

export async function repairMeshTool(params: {
  input: string;
  output: string;
}) {
  try {
    const result = await repairMesh(params.input, params.output);
    return toolResult(result);
  } catch (error) {
    return handleToolError(error);
  }
}
