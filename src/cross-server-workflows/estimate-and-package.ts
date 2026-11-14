import { convertTo3mf } from "../bambu-cli-mcp/tools/convert-to-3mf.js";
import { arrangeProject } from "../bambu-cli-mcp/tools/arrange-project.js";
import { orientProject } from "../bambu-cli-mcp/tools/orient-project.js";
import { estimatePrint } from "../bambu-cli-mcp/tools/estimate-print.js";
import { sliceProject } from "../bambu-cli-mcp/tools/slice-project.js";
import { exportPlatePng } from "../bambu-cli-mcp/tools/export-plate-png.js";
import { unwrapToolEnvelope } from "./unwrap.js";
import { handleToolError } from "../shared/errors.js";
import { toolResult } from "../shared/types.js";
import { mkdir, cp, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

type Output = { output: string };

/**
 * convert -> arrange -> orient -> estimate -> slice -> export PNGs -> package.
 * Estimate and slice failures abort; PNG export is best-effort.
 */
export async function estimateAndPackage(params: {
  files: string[];
  outputDir: string;
  settings?: { machine?: string; process?: string; filaments?: string[] };
}) {
  try {
    await mkdir(params.outputDir, { recursive: true });

    const converted = unwrapToolEnvelope<Output>(await convertTo3mf({ files: params.files }));
    const arranged = unwrapToolEnvelope<Output>(await arrangeProject({ project: converted.output }));
    const oriented = unwrapToolEnvelope<Output>(await orientProject({ project: arranged.output }));

    // Never read estimate.output: estimatePrint deletes its workspace before
    // returning, so that path no longer exists.
    const estimate = unwrapToolEnvelope<{
      estimatedTimeMinutes: number | null;
      filamentUsageGrams: number | null;
    }>(await estimatePrint({ project: oriented.output, settings: params.settings }));

    const sliced = unwrapToolEnvelope<Output>(
      await sliceProject({ project: oriented.output, settings: params.settings }),
    );

    let previews: string[] = [];
    try {
      previews = unwrapToolEnvelope<{ images: string[] }>(
        await exportPlatePng({ project: sliced.output }),
      ).images;
    } catch {
      // Best-effort, like create_print_package.
    }

    const slicedProject = join(params.outputDir, "package.3mf");
    await cp(sliced.output, slicedProject);
    const packagedPreviews: string[] = [];
    for (const preview of previews) {
      const dest = join(params.outputDir, basename(preview));
      await cp(preview, dest);
      packagedPreviews.push(dest);
    }

    const manifestPath = join(params.outputDir, "manifest.json");
    await writeFile(
      manifestPath,
      JSON.stringify(
        {
          files: params.files,
          estimatedTimeMinutes: estimate.estimatedTimeMinutes,
          filamentUsageGrams: estimate.filamentUsageGrams,
          slicedProject,
          previews: packagedPreviews,
        },
        null,
        2,
      ),
    );

    return toolResult({
      manifest: manifestPath,
      pipeline: ["convert_to_3mf", "arrange", "orient", "estimate", "slice", "export_png", "package"],
    });
  } catch (error) {
    return handleToolError(error);
  }
}
