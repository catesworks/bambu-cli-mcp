import { describe, expect, it } from "vitest";
import { createServerForMode } from "../src/index.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

function registeredToolNames(server: McpServer): string[] {
  const internals = server as unknown as {
    _registeredTools: Record<string, unknown>;
  };
  return Object.keys(internals._registeredTools).sort();
}

describe("server selection", () => {
  it("creates the Bambu tool server for bambu mode", () => {
    const tools = registeredToolNames(createServerForMode("bambu"));

    expect(tools).toContain("inspect_bambu_cli");
    expect(tools).toContain("slice_project");
    expect(tools).not.toContain("inspect_mesh");
  });

  it("creates the geometry tool server for geometry mode", () => {
    const tools = registeredToolNames(createServerForMode("geometry"));

    expect(tools).toContain("inspect_mesh");
    expect(tools).toContain("make_printable_large_model");
    expect(tools).not.toContain("inspect_bambu_cli");
  });

  it("creates a combined tool server for both mode", () => {
    const tools = registeredToolNames(createServerForMode("both"));

    expect(tools).toContain("inspect_bambu_cli");
    expect(tools).toContain("slice_project");
    expect(tools).toContain("inspect_mesh");
    expect(tools).toContain("make_printable_large_model");
  });
});
