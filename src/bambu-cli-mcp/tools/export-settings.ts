import { runBambuStudio } from "../adapters/bambu-studio-cli.js";
import { handleToolError } from "../../shared/errors.js";
import { toolResult } from "../../shared/types.js";
import { Workspace } from "../../shared/workspace.js";
import { readFile } from "node:fs/promises";

export async function exportSettings(params: {
  project?: string;
}) {
  const workspace = await Workspace.create();
  try {
    const outputFile = workspace.resolve("output", "settings.json");
    const args: string[] = ["--export-settings", outputFile];

    if (params.project) {
      args.push(params.project);
    }

    args.push("--outputdir", workspace.resolvePath("output"));
    await runBambuStudio(args);

    const settingsRaw = await readFile(outputFile, "utf-8");
    const settings = JSON.parse(settingsRaw);
    return toolResult({ settings, outputFile });
  } catch (error) {
    return handleToolError(error);
  } finally {
    await workspace.cleanup();
  }
}
