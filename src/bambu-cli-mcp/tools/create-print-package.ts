import { runBambuStudio } from "../adapters/bambu-studio-cli.js";
import { handleToolError } from "../../shared/errors.js";
import { toolResult } from "../../shared/types.js";
import { Workspace } from "../../shared/workspace.js";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

export async function createPrintPackage(params: {
  files: string[];
  settings?: {
    machine?: string;
    process?: string;
    filaments?: string[];
  };
  arrange?: boolean;
  orient?: boolean;
  ensureOnBed?: boolean;
  output?: string;
}) {
  const workspace = await Workspace.create();
  try {
    const outputDir = workspace.resolvePath("output");
    const projectName = params.output ?? "project.3mf";
    const projectPath = workspace.resolve("output", projectName);
    const slicedName = projectName.replace(".3mf", "_sliced.3mf");
    const slicedPath = workspace.resolve("output", slicedName);

    // Step 1: Convert + arrange + orient → 3MF
    const convertArgs: string[] = [...params.files];

    if (params.arrange !== false) {
      convertArgs.push("--arrange", "1", "--allow-rotations");
    }
    if (params.orient !== false) {
      convertArgs.push("--orient", "1");
    }
    if (params.ensureOnBed !== false) {
      convertArgs.push("--ensure-on-bed");
    }

    convertArgs.push("--export-3mf", projectPath, "--outputdir", outputDir);
    await runBambuStudio(convertArgs);

    // Step 2: Slice if settings provided
    let slicedOutput: string | null = null;
    if (params.settings) {
      const sliceArgs: string[] = [projectPath];

      if (params.settings.machine || params.settings.process) {
        const settingsFiles: string[] = [];
        if (params.settings.machine) settingsFiles.push(params.settings.machine);
        if (params.settings.process) settingsFiles.push(params.settings.process);
        sliceArgs.push("--load-settings", settingsFiles.join(";"));
      }
      if (params.settings.filaments?.length) {
        sliceArgs.push("--load-filaments", params.settings.filaments.join(";"));
      }

      sliceArgs.push(
        "--slice",
        "0",
        "--export-3mf",
        slicedPath,
        "--outputdir",
        outputDir,
      );

      await runBambuStudio(sliceArgs);
      slicedOutput = slicedPath;
    }

    // Step 3: Export PNG previews
    const pngArgs: string[] = [
      slicedOutput ?? projectPath,
      "--export-png",
      "0",
      "--camera-view",
      "0",
      "--outputdir",
      outputDir,
    ];

    try {
      await runBambuStudio(pngArgs);
    } catch {
      // PNG export is best-effort
    }

    const files = await readdir(outputDir);
    const previews = files
      .filter((f) => f.endsWith(".png"))
      .map((f) => join(outputDir, f));

    return toolResult({
      project3mf: projectPath,
      sliced3mf: slicedOutput,
      previews,
      workspace: workspace.root,
    });
  } catch (error) {
    return handleToolError(error);
  }
}
