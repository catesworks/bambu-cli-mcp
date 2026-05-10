import { runBambuStudio } from "../adapters/bambu-studio-cli.js";
import { handleToolError } from "../../shared/errors.js";
import { toolResult } from "../../shared/types.js";

export async function validateProject(params: {
  project: string;
}) {
  try {
    const result = await runBambuStudio([params.project, "--info"]);
    const output = result.stdout || result.stderr;
    const lines = output.split("\n").filter((l) => l.trim());

    const warnings: string[] = [];
    const info: Record<string, string> = {};

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes("warning") || lower.includes("warn")) {
        warnings.push(line.trim());
      }
      const kvMatch = line.match(/^\s*(.+?):\s+(.+)$/);
      if (kvMatch) {
        info[kvMatch[1].trim()] = kvMatch[2].trim();
      }
    }

    return toolResult({
      valid: warnings.length === 0,
      warnings,
      info,
      rawOutput: output,
    });
  } catch (error) {
    return handleToolError(error);
  }
}
