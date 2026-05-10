import { splitMesh } from "../engines/manifold-engine.js";
import { handleToolError } from "../../shared/errors.js";
import { toolResult } from "../../shared/types.js";
import { mkdir } from "node:fs/promises";

export async function splitMeshTool(params: {
  input: string;
  buildVolume: [number, number, number];
  strategy?: "min_parts" | "grid";
  outputDir: string;
}) {
  try {
    await mkdir(params.outputDir, { recursive: true });
    const result = await splitMesh(
      params.input,
      params.buildVolume,
      params.outputDir,
      params.strategy ?? "min_parts",
    );
    return toolResult(result);
  } catch (error) {
    return handleToolError(error);
  }
}
