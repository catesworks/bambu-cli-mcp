import { inspectMesh, repairMesh } from "../cad-geometry-mcp/engines/manifold-engine.js";
import { convertTo3mf } from "../bambu-cli-mcp/tools/convert-to-3mf.js";
import { arrangeProject } from "../bambu-cli-mcp/tools/arrange-project.js";
import { orientProject } from "../bambu-cli-mcp/tools/orient-project.js";
import { sliceProject } from "../bambu-cli-mcp/tools/slice-project.js";
import { unwrapToolEnvelope } from "./unwrap.js";
import { handleToolError } from "../shared/errors.js";
import { toolResult } from "../shared/types.js";
import { Workspace } from "../shared/workspace.js";
import { mkdir, cp } from "node:fs/promises";
import { join } from "node:path";

type Output = { output: string };

/** inspect -> repair -> convert to 3MF -> arrange -> orient -> slice. */
export async function repairAndSliceCrossServer(params: {
  input: string;
  outputDir: string;
  settings?: { machine?: string; process?: string; filaments?: string[] };
}) {
  const workspace = await Workspace.create();
  try {
    await mkdir(params.outputDir, { recursive: true });

    const originalInfo = await inspectMesh(params.input);

    const repairedPath = workspace.resolve("processed", "repaired.stl");
    const repair = await repairMesh(params.input, repairedPath);

    const converted = unwrapToolEnvelope<Output>(await convertTo3mf({ files: [repairedPath] }));
    const arranged = unwrapToolEnvelope<Output>(await arrangeProject({ project: converted.output }));
    const oriented = unwrapToolEnvelope<Output>(await orientProject({ project: arranged.output }));
    const sliced = unwrapToolEnvelope<Output>(
      await sliceProject({ project: oriented.output, settings: params.settings }),
    );

    const slicedProject = join(params.outputDir, "sliced.3mf");
    await cp(sliced.output, slicedProject);

    return toolResult({
      slicedProject,
      originalInfo,
      repair: {
        watertightBefore: repair.watertightBefore,
        watertightAfter: repair.watertightAfter,
        trianglesBefore: repair.trianglesBefore,
        trianglesAfter: repair.trianglesAfter,
      },
      pipeline: ["inspect", "repair", "convert_to_3mf", "arrange", "orient", "slice"],
    });
  } catch (error) {
    return handleToolError(error);
  } finally {
    await workspace.cleanup();
  }
}
