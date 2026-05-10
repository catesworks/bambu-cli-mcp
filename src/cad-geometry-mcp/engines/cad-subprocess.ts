import { execa } from "execa";

export type CadEngine = "manifold" | "freecad" | "blender" | "fusion";

export interface CadEngineInfo {
  engine: CadEngine;
  available: boolean;
  path?: string;
  version?: string;
}

const engineCache = new Map<CadEngine, CadEngineInfo>();

async function detectBinary(
  name: string,
  versionFlag: string,
  versionParser: (output: string) => string,
): Promise<{ path: string; version: string } | null> {
  try {
    const { stdout: path } = await execa("which", [name]);
    if (!path.trim()) return null;
    try {
      const { stdout } = await execa(path.trim(), [versionFlag], {
        timeout: 5000,
        reject: false,
      });
      return { path: path.trim(), version: versionParser(stdout) };
    } catch {
      return { path: path.trim(), version: "unknown" };
    }
  } catch {
    return null;
  }
}

export async function detectEngine(engine: CadEngine): Promise<CadEngineInfo> {
  const cached = engineCache.get(engine);
  if (cached) return cached;

  let info: CadEngineInfo;

  switch (engine) {
    case "manifold":
      // Always available — it's an npm dependency
      info = { engine: "manifold", available: true, version: "3.4.1 (WASM)" };
      break;

    case "freecad": {
      const result = await detectBinary(
        "freecad",
        "--version",
        (out) => out.match(/[\d.]+/)?.[0] ?? "unknown",
      );
      // Also check FreeCADCmd for headless
      const cmdResult =
        result ??
        (await detectBinary(
          "FreeCADCmd",
          "--version",
          (out) => out.match(/[\d.]+/)?.[0] ?? "unknown",
        ));
      info = cmdResult
        ? {
            engine: "freecad",
            available: true,
            path: cmdResult.path,
            version: cmdResult.version,
          }
        : { engine: "freecad", available: false };
      break;
    }

    case "blender": {
      const result = await detectBinary(
        "blender",
        "--version",
        (out) => out.match(/Blender\s+([\d.]+)/)?.[1] ?? "unknown",
      );
      info = result
        ? {
            engine: "blender",
            available: true,
            path: result.path,
            version: result.version,
          }
        : { engine: "blender", available: false };
      break;
    }

    case "fusion":
      // Fusion 360 doesn't have a CLI — scripting is via its internal API
      // Detection: check if Fusion 360 app exists on macOS
      try {
        const { stdout } = await execa("ls", [
          "/Applications/Autodesk Fusion.app",
        ]);
        info = {
          engine: "fusion",
          available: true,
          path: "/Applications/Autodesk Fusion.app",
          version: "detected",
        };
      } catch {
        info = { engine: "fusion", available: false };
      }
      break;
  }

  engineCache.set(engine, info);
  return info;
}

export async function detectAllEngines(): Promise<CadEngineInfo[]> {
  const engines: CadEngine[] = ["manifold", "freecad", "blender", "fusion"];
  return Promise.all(engines.map(detectEngine));
}

/**
 * Select the best available engine for a given operation.
 * Priority: fusion > freecad > blender > manifold
 * For most operations, manifold is sufficient. CAD engines
 * are only needed for parametric operations or complex booleans.
 */
export async function selectEngine(
  preferred?: CadEngine,
): Promise<CadEngineInfo> {
  if (preferred) {
    const info = await detectEngine(preferred);
    if (info.available) return info;
  }

  // Fallback priority
  const priority: CadEngine[] = ["fusion", "freecad", "blender", "manifold"];
  for (const engine of priority) {
    const info = await detectEngine(engine);
    if (info.available) return info;
  }

  // manifold is always available
  return { engine: "manifold", available: true, version: "3.4.1 (WASM)" };
}
