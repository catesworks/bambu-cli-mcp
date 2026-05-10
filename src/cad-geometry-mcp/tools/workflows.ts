import { inspectMesh, repairMesh, scaleMesh, splitMesh, layFlat } from "../engines/manifold-engine.js";
import { addDowelConnectors, type ConnectorSpec } from "../engines/connectors.js";
import { detectAllEngines } from "../engines/cad-subprocess.js";
import { handleToolError } from "../../shared/errors.js";
import { toolResult } from "../../shared/types.js";
import { Workspace } from "../../shared/workspace.js";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function makePrintableLargeModel(params: {
  input: string;
  scale: number;
  buildVolume: [number, number, number];
  connector?: {
    type: "dowel";
    diameterMm: number;
    depthMm: number;
    clearanceMm: number;
    countPerSeam: number;
  };
  outputDir: string;
}) {
  const workspace = await Workspace.create();
  try {
    // 1. Inspect original
    const info = await inspectMesh(params.input);

    // 2. Scale
    const scaledPath = workspace.resolve("processed", "scaled.stl");
    const scaleResult = await scaleMesh(params.input, scaledPath, params.scale);

    // 3. Repair
    const repairedPath = workspace.resolve("processed", "repaired.stl");
    const repairResult = await repairMesh(scaledPath, repairedPath);

    // 4. Split
    const splitDir = workspace.resolvePath("processed") + "/split";
    const { mkdir } = await import("node:fs/promises");
    await mkdir(splitDir, { recursive: true });
    const splitResult = await splitMesh(
      repairedPath,
      params.buildVolume,
      splitDir,
    );

    // 5. Add connectors (if specified and multiple parts)
    let connectorResult = null;
    let finalPartsDir = splitDir;
    if (params.connector && splitResult.totalParts > 1) {
      const connectedDir = workspace.resolvePath("processed") + "/connected";
      await mkdir(connectedDir, { recursive: true });
      connectorResult = await addDowelConnectors(
        splitDir,
        connectedDir,
        params.connector,
      );
      finalPartsDir = connectedDir;
    }

    // 6. Copy final parts to output
    const { readdir, cp } = await import("node:fs/promises");
    await mkdir(params.outputDir, { recursive: true });
    const finalFiles = await readdir(finalPartsDir);
    const outputParts: string[] = [];
    for (const file of finalFiles) {
      if (file.endsWith(".stl")) {
        const dest = join(params.outputDir, file);
        await cp(join(finalPartsDir, file), dest);
        outputParts.push(dest);
      }
    }

    // 7. Generate manifest
    const manifest = {
      project: params.input,
      scale: params.scale,
      buildVolume: params.buildVolume,
      originalInfo: info,
      scaledBounds: scaleResult.newBounds,
      repair: {
        watertightBefore: repairResult.watertightBefore,
        watertightAfter: repairResult.watertightAfter,
      },
      parts: splitResult.parts.map((p) => ({
        id: p.id,
        file: join(params.outputDir, `part_${p.id}.stl`),
        bounds: p.bounds,
        fitsVolume: p.fitsVolume,
      })),
      connectors: connectorResult?.connectors ?? [],
      totalParts: splitResult.totalParts,
    };

    const manifestPath = join(params.outputDir, "manifest.json");
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    return toolResult({
      manifest: manifestPath,
      parts: outputParts,
      totalParts: outputParts.length,
      pipeline: ["inspect", "scale", "repair", "split", ...(connectorResult ? ["connectors"] : [])],
    });
  } catch (error) {
    return handleToolError(error);
  } finally {
    await workspace.cleanup();
  }
}

export async function repairAndSlice(params: {
  input: string;
  outputDir: string;
}) {
  const workspace = await Workspace.create();
  try {
    const { mkdir } = await import("node:fs/promises");
    await mkdir(params.outputDir, { recursive: true });

    // 1. Inspect
    const info = await inspectMesh(params.input);

    // 2. Repair
    const repairedPath = workspace.resolve("processed", "repaired.stl");
    const repairResult = await repairMesh(params.input, repairedPath);

    // 3. Lay flat
    const flatPath = workspace.resolve("processed", "flat.stl");
    const flatResult = await layFlat(repairedPath, flatPath);

    // 4. Copy repaired+flat STL to output
    const { cp } = await import("node:fs/promises");
    const outputStl = join(params.outputDir, "repaired.stl");
    await cp(flatPath, outputStl);

    return toolResult({
      output: outputStl,
      originalInfo: info,
      repair: {
        watertightBefore: repairResult.watertightBefore,
        watertightAfter: repairResult.watertightAfter,
        trianglesBefore: repairResult.trianglesBefore,
        trianglesAfter: repairResult.trianglesAfter,
      },
      layFlat: flatResult.rotationApplied,
      pipeline: ["inspect", "repair", "lay_flat"],
    });
  } catch (error) {
    return handleToolError(error);
  } finally {
    await workspace.cleanup();
  }
}

export async function splitWithConnectors(params: {
  input: string;
  buildVolume: [number, number, number];
  connector: ConnectorSpec;
  outputDir: string;
}) {
  const workspace = await Workspace.create();
  try {
    const { mkdir } = await import("node:fs/promises");

    // 1. Split
    const splitDir = workspace.resolvePath("processed") + "/split";
    await mkdir(splitDir, { recursive: true });
    const splitResult = await splitMesh(
      params.input,
      params.buildVolume,
      splitDir,
    );

    // 2. Add connectors
    const connectedDir = workspace.resolvePath("processed") + "/connected";
    await mkdir(connectedDir, { recursive: true });
    let connectorResult = null;

    if (splitResult.totalParts > 1) {
      connectorResult = await addDowelConnectors(
        splitDir,
        connectedDir,
        params.connector,
      );
    }

    // 3. Copy to output
    const { readdir, cp } = await import("node:fs/promises");
    await mkdir(params.outputDir, { recursive: true });
    const sourceDir = splitResult.totalParts > 1 ? connectedDir : splitDir;
    const files = await readdir(sourceDir);
    const outputParts: string[] = [];
    for (const file of files) {
      if (file.endsWith(".stl")) {
        const dest = join(params.outputDir, file);
        await cp(join(sourceDir, file), dest);
        outputParts.push(dest);
      }
    }

    // 4. Generate manifest
    const manifestPath = join(params.outputDir, "manifest.json");
    const manifest = {
      input: params.input,
      buildVolume: params.buildVolume,
      parts: splitResult.parts,
      connectors: connectorResult?.connectors ?? [],
      totalParts: outputParts.length,
    };
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    return toolResult({
      manifest: manifestPath,
      parts: outputParts,
      totalParts: outputParts.length,
      connectors: connectorResult?.connectors?.length ?? 0,
      pipeline: ["split", ...(connectorResult ? ["connectors"] : []), "manifest"],
    });
  } catch (error) {
    return handleToolError(error);
  } finally {
    await workspace.cleanup();
  }
}

export async function listAvailableEngines() {
  try {
    const engines = await detectAllEngines();
    return toolResult({
      engines,
      recommended: engines.find((e) => e.available && e.engine !== "manifold")?.engine ?? "manifold",
    });
  } catch (error) {
    return handleToolError(error);
  }
}
