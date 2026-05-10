import { describe, it, expect } from "vitest";
import {
  findBambuStudio,
  parseBambuVersion,
} from "../../src/bambu-cli-mcp/adapters/bambu-studio-cli.js";

describe("bambu-studio-cli adapter", () => {
  describe("parseBambuVersion", () => {
    it("parses version from help output", () => {
      const output = "BambuStudio-02.06.01.55:\nUsage: bambu-studio [ OPTIONS ]";
      expect(parseBambuVersion(output)).toBe("02.06.01.55");
    });

    it("parses version with space separator", () => {
      const output = "BambuStudio 02.06.01.55:\nUsage:";
      expect(parseBambuVersion(output)).toBe("02.06.01.55");
    });

    it("returns unknown for unparseable output", () => {
      expect(parseBambuVersion("no version here")).toBe("unknown");
    });
  });

  describe("findBambuStudio", () => {
    it("finds BambuStudio at the default macOS path", async () => {
      // This test runs on a system where BambuStudio is installed
      const path = await findBambuStudio();
      expect(path).toContain("BambuStudio");
    });
  });
});
