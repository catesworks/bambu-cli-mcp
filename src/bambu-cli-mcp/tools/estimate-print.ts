import { runBambuStudio } from "../adapters/bambu-studio-cli.js";
import { handleToolError } from "../../shared/errors.js";
import { toolResult } from "../../shared/types.js";
import { Workspace } from "../../shared/workspace.js";

export async function estimatePrint(params: {
  project: string;
  settings?: {
    machine?: string;
    process?: string;
    filaments?: string[];
  };
}) {
  const workspace = await Workspace.create();
  try {
    const outputPath = workspace.resolve("output", "estimated.3mf");
    const args: string[] = [params.project, "--estimate-mode"];

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
      "0",
      "--export-3mf",
      "estimated.3mf",
      "--outputdir",
      workspace.resolvePath("output"),
    );

    const result = await runBambuStudio(args);
    const output = result.stdout || result.stderr;

    // Parse estimation data from output
    const timeMatch = output.match(/estimated.*?time.*?(\d+)/i);
    const filamentMatch = output.match(/filament.*?(\d+(?:\.\d+)?)\s*g/i);

    return toolResult({
      output: outputPath,
      rawOutput: output,
      estimatedTimeMinutes: timeMatch ? parseInt(timeMatch[1]) : null,
      filamentUsageGrams: filamentMatch ? parseFloat(filamentMatch[1]) : null,
    });
  } catch (error) {
    return handleToolError(error);
  } finally {
    await workspace.cleanup();
  }
}
