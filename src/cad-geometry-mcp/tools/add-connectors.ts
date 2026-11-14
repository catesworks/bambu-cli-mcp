import { addConnectors, type ConnectorSpec } from "../engines/connectors.js";
import { handleToolError } from "../../shared/errors.js";
import { toolResult } from "../../shared/types.js";
import { mkdir } from "node:fs/promises";

export async function addConnectorsTool(params: {
  inputPartsDir: string;
  connector: ConnectorSpec;
  outputDir: string;
}) {
  try {
    await mkdir(params.outputDir, { recursive: true });
    const result = await addConnectors(
      params.inputPartsDir,
      params.outputDir,
      params.connector,
    );
    return toolResult(result);
  } catch (error) {
    return handleToolError(error);
  }
}
