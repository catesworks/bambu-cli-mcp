import { runBambuStudio } from "../adapters/bambu-studio-cli.js";
import { handleToolError } from "../../shared/errors.js";
import { toolResult } from "../../shared/types.js";
import { Workspace } from "../../shared/workspace.js";

export async function sliceProject(params: {
  project: string;
  plate?: number;
  settings?: {
    machine?: string;
    process?: string;
    filaments?: string[];
  };
  output?: string;
}) {
  const workspace = await Workspace.create();
  try {
    const outputName = params.output ?? "sliced.3mf";
    const outputPath = workspace.resolve("output", outputName);
    const plate = params.plate ?? 0;

    const args: string[] = [params.project];

    // Load settings if provided
    if (params.settings?.machine || params.settings?.process) {
      const settingsFiles: string[] = [];
      if (params.settings.machine) settingsFiles.push(params.settings.machine);
      if (params.settings.process) settingsFiles.push(params.settings.process);
      args.push("--load-settings", settingsFiles.join(";"));
    }

    if (params.settings?.filaments?.length) {
      args.push("--load-filaments", params.settings.filaments.join(";"));
    }

    args.push(
      "--slice",
      String(plate),
      "--export-3mf",
      outputPath,
      "--outputdir",
      workspace.resolvePath("output"),
    );

    await runBambuStudio(args);
    return toolResult({ output: outputPath, plate });
  } catch (error) {
    return handleToolError(error);
  }
}
