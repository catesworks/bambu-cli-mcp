import { addDowelConnectors } from "../engines/connectors.js";
import { handleToolError } from "../../shared/errors.js";
import { toolResult } from "../../shared/types.js";
import { mkdir } from "node:fs/promises";

export async function addConnectorsTool(params: {
  inputPartsDir: string;
  connector: {
    type: "dowel";
    diameterMm: number;
    depthMm: number;
    clearanceMm: number;
    countPerSeam: number;
  };
  outputDir: string;
}) {
  try {
    await mkdir(params.outputDir, { recursive: true });
    const result = await addDowelConnectors(
      params.inputPartsDir,
      params.outputDir,
      params.connector,
    );
    return toolResult(result);
  } catch (error) {
    return handleToolError(error);
  }
}
