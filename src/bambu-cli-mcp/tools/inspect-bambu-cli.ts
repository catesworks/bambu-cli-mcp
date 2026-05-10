import {
  findBambuStudio,
  runBambuStudio,
  parseBambuVersion,
} from "../adapters/bambu-studio-cli.js";
import { handleToolError } from "../../shared/errors.js";
import { toolResult } from "../../shared/types.js";

export async function inspectBambuCli() {
  try {
    const path = await findBambuStudio();
    const result = await runBambuStudio(["--help"]);
    const version = parseBambuVersion(result.stdout || result.stderr);

    const flags: string[] = [];
    const lines = (result.stdout || result.stderr).split("\n");
    for (const line of lines) {
      const match = line.match(/^\s+(--[\w-]+)/);
      if (match) flags.push(match[1]);
    }

    return toolResult({ version, path, availableFlags: flags });
  } catch (error) {
    return handleToolError(error);
  }
}
