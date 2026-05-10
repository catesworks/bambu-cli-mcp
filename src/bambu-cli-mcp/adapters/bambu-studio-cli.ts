import { execa } from "execa";
import { access } from "node:fs/promises";
import { BambuCliError } from "../../shared/errors.js";
import type { BambuCliResult } from "../../shared/types.js";

const DEFAULT_PATHS = [
  "/Applications/BambuStudio.app/Contents/MacOS/BambuStudio",
  "/usr/local/bin/bambu-studio",
  "/usr/bin/bambu-studio",
];

const DEFAULT_TIMEOUT = 5 * 60 * 1000; // 5 minutes

let cachedPath: string | undefined;

export async function findBambuStudio(): Promise<string> {
  if (cachedPath) return cachedPath;

  // Check environment variable first
  const envPath = process.env.BAMBU_STUDIO_PATH;
  if (envPath) {
    try {
      await access(envPath);
      cachedPath = envPath;
      return envPath;
    } catch {
      // Fall through to default paths
    }
  }

  // Check default paths
  for (const p of DEFAULT_PATHS) {
    try {
      await access(p);
      cachedPath = p;
      return p;
    } catch {
      continue;
    }
  }

  // Try which
  try {
    const { stdout } = await execa("which", ["bambu-studio"]);
    const trimmed = stdout.trim();
    if (trimmed) {
      cachedPath = trimmed;
      return trimmed;
    }
  } catch {
    // Not found via which
  }

  throw new BambuCliError(
    "BambuStudio not found. Set BAMBU_STUDIO_PATH or install BambuStudio.",
    "",
    1,
  );
}

export async function runBambuStudio(
  args: string[],
  opts?: { cwd?: string; timeout?: number },
): Promise<BambuCliResult> {
  const binary = await findBambuStudio();
  const timeout = opts?.timeout ?? DEFAULT_TIMEOUT;

  try {
    const result = await execa(binary, args, {
      cwd: opts?.cwd,
      timeout,
      reject: false,
    });

    if (result.exitCode !== 0) {
      throw new BambuCliError(
        `BambuStudio exited with code ${result.exitCode}`,
        result.stderr,
        result.exitCode ?? 1,
      );
    }

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    };
  } catch (error) {
    if (error instanceof BambuCliError) throw error;
    const message =
      error instanceof Error ? error.message : "Unknown CLI error";
    throw new BambuCliError(message, "", 1);
  }
}

export function parseBambuVersion(helpOutput: string): string {
  // First line looks like: "BambuStudio-02.06.01.55:"
  const match = helpOutput.match(/BambuStudio[- ]?([\d.]+)/);
  return match?.[1] ?? "unknown";
}
