import { scaleMesh } from "../engines/manifold-engine.js";
import { handleToolError } from "../../shared/errors.js";
import { toolResult } from "../../shared/types.js";

export async function scaleMeshTool(params: {
  input: string;
  scale: number;
  output: string;
}) {
  try {
    const result = await scaleMesh(params.input, params.output, params.scale);
    return toolResult(result);
  } catch (error) {
    return handleToolError(error);
  }
}
