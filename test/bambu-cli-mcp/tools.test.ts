import { describe, it, expect } from "vitest";
import { inspectBambuCli } from "../../src/bambu-cli-mcp/tools/inspect-bambu-cli.js";

describe("bambu-cli-mcp tools", () => {
  describe("inspect_bambu_cli", () => {
    it("returns version, path, and flags from real CLI", async () => {
      const result = await inspectBambuCli();

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");

      const data = JSON.parse(result.content[0].text);
      expect(data.version).toBe("02.06.01.55");
      expect(data.path).toContain("BambuStudio");
      expect(data.availableFlags).toContain("--slice");
      expect(data.availableFlags).toContain("--export-3mf");
      expect(data.availableFlags).toContain("--arrange");
      expect(data.availableFlags).toContain("--orient");
      expect(data.availableFlags).toContain("--export-stls");
      expect(data.availableFlags.length).toBeGreaterThan(30);
    });
  });
});

describe("shared utilities", () => {
  describe("toolResult", () => {
    it("produces valid MCP content structure", async () => {
      const { toolResult } = await import("../../src/shared/types.js");
      const result = toolResult({ foo: "bar" });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      expect(JSON.parse(result.content[0].text)).toEqual({ foo: "bar" });
    });
  });

  describe("toolError", () => {
    it("produces error MCP content structure", async () => {
      const { toolError } = await import("../../src/shared/types.js");
      const result = toolError("something failed");

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(JSON.parse(result.content[0].text)).toEqual({
        error: "something failed",
      });
    });
  });
});
