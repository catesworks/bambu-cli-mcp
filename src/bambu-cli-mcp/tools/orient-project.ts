import { runBambuStudio } from "../adapters/bambu-studio-cli.js";
import { handleToolError } from "../../shared/errors.js";
import { toolResult } from "../../shared/types.js";
import { Workspace } from "../../shared/workspace.js";

export async function orientProject(params: {
  project: string;
}) {
  const workspace = await Workspace.create();
  try {
    const outputPath = workspace.resolve("output", "oriented.3mf");
    const args: string[] = [
      params.project,
      "--orient",
      "1",
      "--export-3mf",
      outputPath,
      "--outputdir",
      workspace.resolvePath("output"),
    ];

    await runBambuStudio(args);
    return toolResult({ output: outputPath });
  } catch (error) {
    return handleToolError(error);
  }
}
