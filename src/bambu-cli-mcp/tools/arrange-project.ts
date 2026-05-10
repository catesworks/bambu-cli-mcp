import { runBambuStudio } from "../adapters/bambu-studio-cli.js";
import { handleToolError } from "../../shared/errors.js";
import { toolResult } from "../../shared/types.js";
import { Workspace } from "../../shared/workspace.js";

export async function arrangeProject(params: {
  project: string;
  allowRotations?: boolean;
  ensureOnBed?: boolean;
}) {
  const workspace = await Workspace.create();
  try {
    const outputPath = workspace.resolve("output", "arranged.3mf");
    const args: string[] = [
      params.project,
      "--arrange",
      "1",
      "--export-3mf",
      outputPath,
      "--outputdir",
      workspace.resolvePath("output"),
    ];

    if (params.allowRotations !== false) {
      args.push("--allow-rotations");
    }
    if (params.ensureOnBed !== false) {
      args.push("--ensure-on-bed");
    }

    await runBambuStudio(args);
    return toolResult({ output: outputPath });
  } catch (error) {
    return handleToolError(error);
  }
}
