import { layFlat } from "../engines/manifold-engine.js";
import { handleToolError } from "../../shared/errors.js";
import { toolResult } from "../../shared/types.js";

export async function layFlatTool(params: {
  input: string;
  output: string;
}) {
  try {
    const result = await layFlat(params.input, params.output);
    return toolResult(result);
  } catch (error) {
    return handleToolError(error);
  }
}
