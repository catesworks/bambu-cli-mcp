import { existsSync } from "node:fs";

/** True when a real BambuStudio binary is available for CLI tests. */
export const hasBambuStudio =
  Boolean(process.env.BAMBU_STUDIO_PATH) ||
  existsSync("/Applications/BambuStudio.app/Contents/MacOS/BambuStudio");
