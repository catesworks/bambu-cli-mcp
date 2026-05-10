import { describe, it, expect, afterEach } from "vitest";
import { Workspace } from "../../src/shared/workspace.js";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

describe("Workspace", () => {
  const workspaces: Workspace[] = [];

  afterEach(async () => {
    for (const ws of workspaces) {
      await ws.cleanup();
    }
    workspaces.length = 0;
  });

  it("creates workspace with subdirectories", async () => {
    const ws = await Workspace.create();
    workspaces.push(ws);

    expect(existsSync(join(ws.root, "source"))).toBe(true);
    expect(existsSync(join(ws.root, "processed"))).toBe(true);
    expect(existsSync(join(ws.root, "output"))).toBe(true);
    expect(existsSync(join(ws.root, "logs"))).toBe(true);
  });

  it("resolves safe filenames within subdirectories", async () => {
    const ws = await Workspace.create();
    workspaces.push(ws);

    const resolved = ws.resolve("output", "test.3mf");
    expect(resolved).toBe(join(ws.root, "output", "test.3mf"));
  });

  it("resolves subdir paths", async () => {
    const ws = await Workspace.create();
    workspaces.push(ws);

    const outputDir = ws.resolvePath("output");
    expect(outputDir).toBe(join(ws.root, "output"));
  });

  it("copies input files to source directory", async () => {
    const ws = await Workspace.create();
    workspaces.push(ws);

    // Create a temp file to copy
    const tempFile = join(ws.root, "temp-test.txt");
    writeFileSync(tempFile, "test content");

    const copied = await ws.copyInput(tempFile);
    expect(existsSync(copied)).toBe(true);
    expect(copied).toContain("source");
  });

  it("lists output files", async () => {
    const ws = await Workspace.create();
    workspaces.push(ws);

    writeFileSync(ws.resolve("output", "a.stl"), "data");
    writeFileSync(ws.resolve("output", "b.stl"), "data");

    const outputs = await ws.listOutputs();
    expect(outputs).toHaveLength(2);
  });

  it("cleans up workspace on cleanup()", async () => {
    const ws = await Workspace.create();
    const root = ws.root;
    expect(existsSync(root)).toBe(true);

    await ws.cleanup();
    expect(existsSync(root)).toBe(false);
  });
});
