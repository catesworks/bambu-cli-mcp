import { randomUUID } from "node:crypto";
import { mkdir, cp, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, basename } from "node:path";

export class Workspace {
  private constructor(public readonly root: string) {}

  static async create(): Promise<Workspace> {
    const id = randomUUID().slice(0, 8);
    const root = join(tmpdir(), `bambu-mcp-${id}`);
    await mkdir(join(root, "source"), { recursive: true });
    await mkdir(join(root, "processed"), { recursive: true });
    await mkdir(join(root, "output"), { recursive: true });
    await mkdir(join(root, "logs"), { recursive: true });
    return new Workspace(root);
  }

  resolve(subdir: "source" | "processed" | "output" | "logs", filename: string): string {
    const safe = basename(filename);
    if (safe !== filename && !filename.includes("/")) {
      throw new Error(`Invalid filename: ${filename}`);
    }
    return join(this.root, subdir, safe);
  }

  resolvePath(subdir: "source" | "processed" | "output" | "logs"): string {
    return join(this.root, subdir);
  }

  async copyInput(sourcePath: string): Promise<string> {
    const absSource = resolve(sourcePath);
    const dest = this.resolve("source", basename(absSource));
    await cp(absSource, dest);
    return dest;
  }

  async listOutputs(): Promise<string[]> {
    const outputDir = this.resolvePath("output");
    const files = await readdir(outputDir);
    return files.map((f) => join(outputDir, f));
  }

  async cleanup(): Promise<void> {
    await rm(this.root, { recursive: true, force: true });
  }
}
