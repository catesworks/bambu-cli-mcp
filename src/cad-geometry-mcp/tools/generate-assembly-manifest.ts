import { writeFile } from "node:fs/promises";
import { handleToolError } from "../../shared/errors.js";
import { toolResult } from "../../shared/types.js";

interface ManifestPart {
  id: string;
  file: string;
  neighbors?: string[];
}

interface ManifestConnector {
  seam: string;
  type: string;
  diameterMm?: number;
  depthMm?: number;
  clearanceMm?: number;
  count?: number;
}

export async function generateAssemblyManifestTool(params: {
  parts: ManifestPart[];
  project?: string;
  printer?: string;
  scale?: number;
  connectors?: ManifestConnector[];
  outputFile: string;
}) {
  try {
    const manifest = {
      project: params.project ?? "untitled",
      printer: params.printer ?? "unknown",
      scale: params.scale ?? 1,
      parts: params.parts.map((p) => ({
        id: p.id,
        file: p.file,
        neighbors: p.neighbors ?? [],
      })),
      connectors: params.connectors ?? [],
      hardware: [],
      generatedAt: new Date().toISOString(),
    };

    await writeFile(params.outputFile, JSON.stringify(manifest, null, 2));
    return toolResult({ manifest, outputFile: params.outputFile });
  } catch (error) {
    return handleToolError(error);
  }
}
