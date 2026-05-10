import { runBambuStudio } from "../adapters/bambu-studio-cli.js";
import { handleToolError } from "../../shared/errors.js";
import { toolResult } from "../../shared/types.js";
import { Workspace } from "../../shared/workspace.js";

export async function convertTo3mf(params: {
  files: string[];
  output?: string;
}) {
  const workspace = await Workspace.create();
  try {
    const outputName = params.output ?? "output.3mf";
    const outputPath = workspace.resolve("output", outputName);

    const args: string[] = [
      ...params.files,
      "--export-3mf",
      outputName,
      "--outputdir",
      workspace.resolvePath("output"),
    ];

    await runBambuStudio(args);
    return toolResult({ output: outputPath });
  } catch (error) {
    return handleToolError(error);
  }
}
