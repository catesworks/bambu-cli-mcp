import { runBambuStudio } from "../adapters/bambu-studio-cli.js";
import { handleToolError } from "../../shared/errors.js";
import { toolResult } from "../../shared/types.js";
import { Workspace } from "../../shared/workspace.js";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

export async function exportStls(params: {
  project: string;
}) {
  const workspace = await Workspace.create();
  try {
    const outputDir = workspace.resolvePath("output");
    const args: string[] = [
      params.project,
      "--export-stls",
      "--outputdir",
      outputDir,
    ];

    await runBambuStudio(args);

    const files = await readdir(outputDir);
    const stls = files
      .filter((f) => f.endsWith(".stl"))
      .map((f) => join(outputDir, f));

    return toolResult({ files: stls, count: stls.length });
  } catch (error) {
    return handleToolError(error);
  }
}
