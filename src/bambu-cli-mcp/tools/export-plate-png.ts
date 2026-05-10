import { runBambuStudio } from "../adapters/bambu-studio-cli.js";
import { handleToolError } from "../../shared/errors.js";
import { toolResult } from "../../shared/types.js";
import { Workspace } from "../../shared/workspace.js";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

export async function exportPlatePng(params: {
  project: string;
  plate?: number;
  cameraView?: number;
}) {
  const workspace = await Workspace.create();
  try {
    const plate = params.plate ?? 0;
    const cameraView = params.cameraView ?? 0;
    const outputDir = workspace.resolvePath("output");

    const args: string[] = [
      params.project,
      "--export-png",
      String(plate),
      "--camera-view",
      String(cameraView),
      "--outputdir",
      outputDir,
    ];

    await runBambuStudio(args);

    const files = await readdir(outputDir);
    const images = files
      .filter((f) => f.endsWith(".png"))
      .map((f) => join(outputDir, f));

    return toolResult({ images, plate, cameraView });
  } catch (error) {
    return handleToolError(error);
  }
}
