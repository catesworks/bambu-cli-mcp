# Phase 5 Workflow Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use beads-superpowers:subagent-driven-development (recommended) or beads-superpowers:executing-plans to implement this plan task-by-task. Each Task becomes a bead (`bd create -t task --parent <epic-id>`). Steps within tasks use checkbox (`- [ ]`) syntax for human readability.

**Status:** pending approval (planning-only artifact; no code has been touched)

**Revision:** v2 — revised after an Architect review (round 1) found: (1) the envelope type used throughout v1's code sketches (`content: [{type:"text",text:string}]`) is a TUPLE, but `toolResult()`/`toolError()` (`src/shared/types.ts:7-11`) actually return an ARRAY (`content: {type:"text",text:string}[]`) — this fails `tsc` at every call site in both new files, and `pnpm test` (esbuild-based `vitest`) does not typecheck, so v1 would have shipped a plan whose own verification steps report PASS while the build is broken; (2) Decision Driver 2 was factually wrong about `estimate-print.ts` having no `finally` cleanup — it does, which means `estimatePrint`'s returned `output` path is a dangling reference to an already-deleted temp dir, not a leaked-but-usable one; (3) Task 1 Step 6 creates `src/cross-server-workflows/server.ts` importing `estimate-and-package.js`, a file Task 2 doesn't create until later — Task 1 cannot build or pass its own verification standalone as written. A paired Critic review was planned but the session was interrupted before it returned; this revision proceeds on the Architect findings alone (independently reproduced by compiling the plan's exact code against the real source), with a note to re-review before merge. See Changelog for details.

**Goal:** Close the two remaining Phase 5 orchestration gaps from `.omc/plans/bambu-cli-mcp-plan.md` — a real cross-server `repair_and_slice` pipeline (Step 5.2) and a new `estimate_and_package` workflow (Step 5.4) — so all 4 Phase 5 workflow tools described in the original plan actually exist.

**Architecture:** New module `src/cross-server-workflows/` holds both tools. Unlike existing workflow tools (`src/cad-geometry-mcp/tools/workflows.ts`, which only calls in-process `manifold-engine` functions), these two workflows must call across both tool families: `cad-geometry-mcp/engines/manifold-engine.js` (plain data-returning functions) AND `bambu-cli-mcp/tools/*.js` (MCP-envelope-returning functions that each spin up their own `Workspace`). They are registered only in `createCombinedServer()` (`src/index.ts:26-36`), since they are meaningless under `--server bambu` or `--server geometry` alone.

**Tech Stack:** TypeScript, `@modelcontextprotocol/sdk`, `zod`, existing `execa`-based `runBambuStudio` adapter (`src/bambu-cli-mcp/adapters/bambu-studio-cli.ts`) — no new dependencies.

## Global Constraints

- No new npm dependencies (repo `package.json` deps list is: `@modelcontextprotocol/sdk`, `execa`, `manifold-3d`, `zod` — stay within this set).
- Do not modify existing tool files under `src/bambu-cli-mcp/tools/*` or `src/cad-geometry-mcp/tools/workflows.ts` — this is additive-only, existing tools/tests must keep passing unchanged.
- Every new tool must be registered ONLY inside `createCombinedServer()` (`src/index.ts:26`), not in `registerBambuCliTools` or `registerCadGeometryTools` individually — these workflows require both tool sets to be present.
- Follow existing error-handling convention: `handleToolError` (`src/shared/errors.ts`) + `toolResult`/`toolError` (`src/shared/types.ts`).
- Follow existing workspace convention: one `Workspace.create()` per top-level workflow invocation, `finally { await workspace.cleanup() }`.
- Any code sketch's envelope type must match the REAL return shape of `toolResult`/`toolError` (`src/shared/types.ts:7-11`): `{content: {type:"text",text:string}[], isError?: boolean}` — an ARRAY, not a tuple. `pnpm lint` (`tsc --noEmit`) must be run at the end of every task, since `pnpm test` (vitest/esbuild) does not typecheck and will not catch a tuple/array mismatch (v2 addition).

## RALPLAN-DR Summary

**Principles:**
1. Additive only — never touch a tested, working file to add a new cross-cutting capability.
2. Match the literal Phase 5 spec pipeline order (`.omc/plans/bambu-cli-mcp-plan.md:467-477`) — don't reinterpret scope.
3. Reuse existing per-tool functions as black boxes; don't fork their internal CLI-arg-building logic.
4. Fail closed: propagate `isError` from any wrapped tool call instead of silently continuing the pipeline.
5. Keep the two workflows independent — `estimate_and_package` must not depend on `repair_and_slice` or vice versa.

**Decision Drivers (top 3):**
1. Existing `bambu-cli-mcp` tool functions (`convertTo3mf`, `arrangeProject`, `orientProject`, `sliceProject`, `estimatePrint`, `exportPlatePng`) already return `toolResult(...)` MCP envelopes (`{content:[{type:"text",text:JSON}]}`), not plain data — unlike `cad-geometry-mcp`'s engine layer. A composition strategy must be picked.
2. `bambu-cli-mcp` tool functions each call `Workspace.create()` internally. **v2 correction:** 5 of them (`convert-to-3mf.ts`, `arrange-project.ts`, `orient-project.ts`, `slice-project.ts`, `export-plate-png.ts`) never call `cleanup()`, so their returned output path stays valid (leaked temp dir, but readable) — this is what makes chaining them work at all. `estimate-print.ts:54-56` is the ONE exception: it DOES call `cleanup()` in a `finally` block, so `estimatePrint`'s returned `output` field points at an already-deleted directory by the time the caller sees it. v1's Decision Driver 2 incorrectly listed `estimate-print.ts` among the "no cleanup" files. This plan's `estimate_and_package` workflow (Task 2) must never read `estimate.output` — only `estimatedTimeMinutes`/`filamentUsageGrams` are safe to use from that call, and Task 2's code already does this correctly by accident; v2 makes it an explicit, commented invariant instead of an accident (see Task 2 Step 4).
3. There is no test precedent yet for a workflow that spans both tool families — the test convention (`test/cad-geometry-mcp/workflows.test.ts`) only covers same-family orchestration.
4. **(new in v2)** The envelope shape returned by every wrapped `bambu-cli-mcp` tool function is `{content: {type:"text",text:string}[], isError?: boolean}` (an array — `src/shared/types.ts:7-11`), not the tuple shape (`content: [{type:"text",text:string}]`) v1's code sketches used throughout. A tuple-typed `unwrap`/`unwrapToolEnvelope` fails `tsc` against every real call site.

**Viable Options:**

- **Option A — Call-and-unwrap (chosen):** Cross-server workflow functions call the existing exported `bambu-cli-mcp` tool functions directly, unwrap their MCP envelope (`JSON.parse(result.content[0].text)`), check `result.isError` after each call, and pass the resulting `.output` path string into the next step. Zero changes to existing files.
  - Pros: no regression risk to 11 already-tested bambu-cli-mcp tools; minimal new surface area; matches the "additive only" constraint exactly.
  - Cons: does not fix the temp-dir-accumulation issue (pre-existing, out of scope); slightly awkward envelope-unwrapping boilerplate repeated in both new tools.
- **Option B — Extract data-returning core functions:** Refactor each of the 6 `bambu-cli-mcp` tool files to split into a plain-data `xxxCore()` function + a thin `xxxTool()` wrapper that calls `toolResult(await xxxCore())`, mirroring the `cad-geometry-mcp` engine/tool split.
  - Pros: cleaner long-term architecture, symmetric with `cad-geometry-mcp`, fixes envelope-unwrapping boilerplate for any future cross-server workflow.
  - Cons: touches 6 existing, tested files (`convert-to-3mf.ts`, `arrange-project.ts`, `orient-project.ts`, `slice-project.ts`, `estimate-print.ts`, `export-plate-png.ts`) for a benefit only 2 new tools need right now — violates the plan's own "additive only" / YAGNI principle. Rejected for this plan; worth reconsidering only if a 3rd cross-server workflow is requested later.

**Invalidation rationale:** Option B is invalidated by scope — refactoring 6 stable, tested files to serve 2 new call sites is premature generalization (YAGNI). Revisit if a future Phase 5 addition needs a 3rd cross-server composition.

---

### Task 1: `repair_and_slice` cross-server workflow tool

**Files:**
- Create: `src/cross-server-workflows/repair-and-slice.ts`
- Create: `src/cross-server-workflows/schemas.ts` (shared by Task 1 and Task 2)
- Modify: `src/index.ts:26-36` (register new tool inside `createCombinedServer`)
- Test: `test/cross-server-workflows/repair-and-slice.test.ts`

**Interfaces:**
- Consumes:
  - `inspectMesh(path: string): Promise<{bounds, triangleCount, volume, watertight, ...}>` — `src/cad-geometry-mcp/engines/manifold-engine.ts` (imported already by `src/cad-geometry-mcp/tools/workflows.ts:1`)
  - `repairMesh(input: string, output: string): Promise<{watertightBefore, watertightAfter, trianglesBefore, trianglesAfter}>` — same module
  - `convertTo3mf(params: {files: string[]; output?: string}): Promise<{content: {type:"text", text: string}[]; isError?: boolean}>` — `src/bambu-cli-mcp/tools/convert-to-3mf.ts:6` (v2: envelope is an array, not a tuple — see Decision Driver 4)
  - `arrangeProject(params: {project: string; allowRotations?: boolean; ensureOnBed?: boolean}): Promise<{content:{type:"text",text:string}[]; isError?: boolean}>` — `src/bambu-cli-mcp/tools/arrange-project.ts:6`
  - `orientProject(params: {project: string}): Promise<{content:{type:"text",text:string}[]; isError?: boolean}>` — `src/bambu-cli-mcp/tools/orient-project.ts:6`
  - `sliceProject(params: {project: string; plate?: number; settings?: {machine?:string; process?:string; filaments?:string[]}; output?: string}): Promise<{content:{type:"text",text:string}[]; isError?: boolean}>` — `src/bambu-cli-mcp/tools/slice-project.ts:6`
  - `handleToolError(error: unknown)`, `toolResult(data: unknown)` — `src/shared/errors.ts`, `src/shared/types.ts`
  - `Workspace.create()` — `src/shared/workspace.ts:8`
- Produces:
  - `repairAndSliceCrossServer(params: RepairAndSliceCrossServerParams): Promise<ToolResult>` exported from `src/cross-server-workflows/repair-and-slice.ts`
  - `RepairAndSliceCrossServerSchema` (zod) exported from `src/cross-server-workflows/schemas.ts`
  - MCP tool name: `repair_and_slice` (distinct from the existing `repair_and_prepare` tool at `src/cad-geometry-mcp/server.ts:102` — do not rename or remove that tool)

**Acceptance Criteria:**
- Calling `repair_and_slice` with a valid STL path runs the full spec'd pipeline in order: inspect → repair → convert to 3MF → arrange → orient → slice (`.omc/plans/bambu-cli-mcp-plan.md:467-469`).
- Output includes the final sliced `.3mf` path, the original mesh inspection info, and repair before/after stats (watertight + triangle counts).
- If any step's MCP envelope has `isError: true`, the workflow stops immediately and returns that error (does not attempt subsequent steps).
- The workspace's temp dir is cleaned up in a `finally` block regardless of success/failure.
- New tool is registered ONLY in `createCombinedServer()` — running `--server bambu` or `--server geometry` alone does NOT expose `repair_and_slice` (verified by test).
- Existing `repair_and_prepare` tool (`src/cad-geometry-mcp/server.ts:101-106`) is untouched and its test (`test/cad-geometry-mcp/workflows.test.ts`) still passes unmodified.
- `pnpm lint` (`tsc --noEmit`) passes with zero errors — Task 1 must build standalone (its `server.ts` registers only `repair_and_slice`; it does not reference `estimate-and-package.ts`, which doesn't exist until Task 2 — v2 fix).

- [ ] **Step 1: Write the schemas file**

```typescript
// src/cross-server-workflows/schemas.ts
import { z } from "zod";

export const RepairAndSliceCrossServerSchema = z.object({
  input: z.string().describe("Path to input STL file"),
  outputDir: z.string().describe("Directory for final sliced output"),
  settings: z
    .object({
      machine: z.string().optional(),
      process: z.string().optional(),
      filaments: z.array(z.string()).optional(),
    })
    .optional()
    .describe("Optional BambuStudio machine/process/filament settings for slicing"),
});

export const EstimateAndPackageSchema = z.object({
  files: z.array(z.string()).describe("Paths to input STL/OBJ files"),
  outputDir: z.string().describe("Directory for the final package"),
  settings: z
    .object({
      machine: z.string().optional(),
      process: z.string().optional(),
      filaments: z.array(z.string()).optional(),
    })
    .optional()
    .describe("Optional BambuStudio machine/process/filament settings"),
});
```

- [ ] **Step 2: Write the failing test for the happy path**

```typescript
// test/cross-server-workflows/repair-and-slice.test.ts
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { join } from "node:path";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { generateTestCubeStl } from "../helpers/generate-test-cube.js";

const testDir = join(tmpdir(), "bambu-mcp-cross-server-test");
const cubeStl = join(testDir, "cube.stl");

beforeAll(() => {
  mkdirSync(testDir, { recursive: true });
  writeFileSync(cubeStl, generateTestCubeStl());
});

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe("repairAndSliceCrossServer", () => {
  it("runs inspect -> repair -> convert -> arrange -> orient -> slice in order", async () => {
    const { repairAndSliceCrossServer } = await import(
      "../../src/cross-server-workflows/repair-and-slice.js"
    );
    const outputDir = join(testDir, "repair_slice_output");
    const result = await repairAndSliceCrossServer({ input: cubeStl, outputDir });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.pipeline).toEqual([
      "inspect",
      "repair",
      "convert_to_3mf",
      "arrange",
      "orient",
      "slice",
    ]);
    expect(parsed.slicedProject).toBeTruthy();
    expect(parsed.originalInfo.watertight).toBeDefined();
    expect(parsed.repair.watertightBefore).toBeDefined();
    expect(parsed.repair.watertightAfter).toBeDefined();
  });

  it("stops and returns the error when a step fails", async () => {
    const { repairAndSliceCrossServer } = await import(
      "../../src/cross-server-workflows/repair-and-slice.js"
    );
    const result = await repairAndSliceCrossServer({
      input: join(testDir, "does-not-exist.stl"),
      outputDir: join(testDir, "repair_slice_error_output"),
    });
    expect(result.isError).toBe(true);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm vitest run test/cross-server-workflows/repair-and-slice.test.ts`
Expected: FAIL with "Cannot find module '../../src/cross-server-workflows/repair-and-slice.js'"

- [ ] **Step 4: Write the implementation**

```typescript
// src/cross-server-workflows/repair-and-slice.ts
import { inspectMesh, repairMesh } from "../cad-geometry-mcp/engines/manifold-engine.js";
import { convertTo3mf } from "../bambu-cli-mcp/tools/convert-to-3mf.js";
import { arrangeProject } from "../bambu-cli-mcp/tools/arrange-project.js";
import { orientProject } from "../bambu-cli-mcp/tools/orient-project.js";
import { sliceProject } from "../bambu-cli-mcp/tools/slice-project.js";
import { handleToolError } from "../shared/errors.js";
import { toolResult, toolError } from "../shared/types.js";
import { Workspace } from "../shared/workspace.js";
import { mkdir, cp } from "node:fs/promises";
import { join } from "node:path";

function unwrap(envelope: { content: { type: "text"; text: string }[]; isError?: boolean }) {
  const data = JSON.parse(envelope.content[0].text);
  if (envelope.isError) {
    throw new Error(data.error ?? "Cross-server step failed");
  }
  return data;
}

export async function repairAndSliceCrossServer(params: {
  input: string;
  outputDir: string;
  settings?: { machine?: string; process?: string; filaments?: string[] };
}) {
  const workspace = await Workspace.create();
  try {
    await mkdir(params.outputDir, { recursive: true });

    // 1. Inspect
    const originalInfo = await inspectMesh(params.input);

    // 2. Repair
    const repairedPath = workspace.resolve("processed", "repaired.stl");
    const repair = await repairMesh(params.input, repairedPath);

    // 3. Convert to 3MF
    const converted = unwrap(await convertTo3mf({ files: [repairedPath] }));

    // 4. Arrange
    const arranged = unwrap(await arrangeProject({ project: converted.output }));

    // 5. Orient
    const oriented = unwrap(await orientProject({ project: arranged.output }));

    // 6. Slice
    const sliced = unwrap(
      await sliceProject({ project: oriented.output, settings: params.settings }),
    );

    const finalPath = join(params.outputDir, "sliced.3mf");
    await cp(sliced.output, finalPath);

    return toolResult({
      slicedProject: finalPath,
      originalInfo,
      repair: {
        watertightBefore: repair.watertightBefore,
        watertightAfter: repair.watertightAfter,
        trianglesBefore: repair.trianglesBefore,
        trianglesAfter: repair.trianglesAfter,
      },
      pipeline: ["inspect", "repair", "convert_to_3mf", "arrange", "orient", "slice"],
    });
  } catch (error) {
    return handleToolError(error);
  } finally {
    await workspace.cleanup();
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run test/cross-server-workflows/repair-and-slice.test.ts`
Expected: PASS (requires BambuStudio CLI installed locally per `docs/setup.md`; if unavailable in CI, mark `it.skipIf(!process.env.BAMBU_STUDIO_PATH)`)

- [ ] **Step 6: Register the tool in the combined server**

**v2 fix (Decision Driver — task-sequencing break):** v1 had this step create `src/cross-server-workflows/server.ts` importing `estimate-and-package.js`, which Task 2 doesn't create until later — Task 1 could not build or pass its own tests standalone. This task now registers ONLY `repair_and_slice`; Task 2 Step 6 extends this same file to add `estimate_and_package`.

Modify `src/index.ts`:

```typescript
import { registerCrossServerWorkflowTools } from "./cross-server-workflows/server.js";
// ...
export function createCombinedServer(): McpServer {
  const server = new McpServer({
    name: "bambu-cli-mcp-combined",
    version: "0.1.0",
  });

  registerBambuCliTools(server);
  registerCadGeometryTools(server);
  registerCrossServerWorkflowTools(server);

  return server;
}
```

Create `src/cross-server-workflows/server.ts` (Task 1: registers `repair_and_slice` only):

```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { RepairAndSliceCrossServerSchema } from "./schemas.js";
import { repairAndSliceCrossServer } from "./repair-and-slice.js";

export function registerCrossServerWorkflowTools(server: McpServer): void {
  server.tool(
    "repair_and_slice",
    "Cross-server pipeline: inspect -> repair -> convert to 3MF -> arrange -> orient -> slice. Requires --server both.",
    RepairAndSliceCrossServerSchema.shape,
    async (params) => repairAndSliceCrossServer(params),
  );

  // Task 2 adds the estimate_and_package registration here, once
  // src/cross-server-workflows/estimate-and-package.ts exists.
}
```

- [ ] **Step 7: Add a server-selection regression test**

Extend `test/server-selection.test.ts` with a case asserting `repair_and_slice` is listed under `--server both` but absent under `--server bambu` and `--server geometry`. Follow the existing test's structure in that file exactly (reuse its tool-listing helper). Task 2 extends this same test case to also cover `estimate_and_package`.

- [ ] **Step 8: Typecheck, then run full test suite**

Run: `pnpm lint` (`tsc --noEmit`) — expect PASS. This is the gate that catches the tuple/array envelope mismatch from v1; `pnpm test` alone (vitest/esbuild) does not typecheck and would report a false PASS.
Run: `pnpm test`
Expected: PASS, no regressions in the 11 bambu-cli-mcp tools, 6 cad-geometry-mcp tools, or 4 existing workflow tools.

- [ ] **Step 9: Commit**

```bash
git add src/cross-server-workflows/ src/index.ts test/cross-server-workflows/ test/server-selection.test.ts
git commit -m "feat: add repair_and_slice and estimate_and_package cross-server workflows"
```

---

### Task 2: `estimate_and_package` cross-server workflow tool

**Files:**
- Create: `src/cross-server-workflows/estimate-and-package.ts`
- Modify: `src/cross-server-workflows/schemas.ts` (already created in Task 1, Step 1 — `EstimateAndPackageSchema` already present)
- Modify: `src/cross-server-workflows/server.ts` (already registers `estimate_and_package` in Task 1, Step 6)
- Test: `test/cross-server-workflows/estimate-and-package.test.ts`

**Interfaces:**
- Consumes:
  - `convertTo3mf`, `arrangeProject`, `orientProject`, `sliceProject`, `exportPlatePng` (same signatures as Task 1)
  - `estimatePrint(params: {project: string; settings?: {machine?:string; process?:string; filaments?:string[]}}): Promise<{content:{type:"text",text:string}[]; isError?: boolean}>` — `src/bambu-cli-mcp/tools/estimate-print.ts:6`, envelope data shape `{output, rawOutput, estimatedTimeMinutes, filamentUsageGrams}`. **`output` is DANGLING** — `estimate-print.ts:54-56` cleans up its workspace before returning, so this path points at an already-deleted directory (Decision Driver 2). Only read `estimatedTimeMinutes`/`filamentUsageGrams` from this call.
  - Same `unwrap()` helper from Task 1 — move it into a shared `src/cross-server-workflows/unwrap.ts` module so both tasks import one copy (do not duplicate the function).
- Produces:
  - `estimateAndPackage(params: EstimateAndPackageParams): Promise<ToolResult>` exported from `src/cross-server-workflows/estimate-and-package.ts`
  - Output package structure on disk: `params.outputDir/package.3mf` (sliced), `params.outputDir/*.png` (previews), `params.outputDir/manifest.json` (following the same manifest pattern as `src/cad-geometry-mcp/tools/workflows.ts:73-95`)

**Acceptance Criteria:**
- Calling `estimate_and_package` with STL file paths runs: convert → arrange → orient → estimate → slice → export PNGs → package (`.omc/plans/bambu-cli-mcp-plan.md:475-477`).
- `manifest.json` in the output dir lists: input files, estimated time (minutes) and filament usage (grams) from the `estimate` step, the sliced 3MF path, and the list of PNG preview paths.
- If `estimatePrint` or `sliceProject` returns `isError: true`, the workflow aborts and surfaces that error — it does not silently fall back to "no estimate".
- PNG export failure is non-fatal (matches existing `create_print_package` precedent at `src/bambu-cli-mcp/tools/create-print-package.ts:83-87` — wrap in try/catch, PNG export is best-effort) but estimate/slice failures ARE fatal (this differs deliberately from `create_print_package`, which has no estimate step to protect).
- Test asserts `manifest.json` round-trips through `JSON.parse` and contains all 4 fields above.

- [ ] **Step 1: Write the failing test**

```typescript
// test/cross-server-workflows/estimate-and-package.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { join } from "node:path";
import { writeFileSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { generateTestCubeStl } from "../helpers/generate-test-cube.js";

const testDir = join(tmpdir(), "bambu-mcp-estimate-package-test");
const cubeStl = join(testDir, "cube.stl");

beforeAll(() => {
  mkdirSync(testDir, { recursive: true });
  writeFileSync(cubeStl, generateTestCubeStl());
});

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe("estimateAndPackage", () => {
  it("produces a manifest with estimate, sliced project, and previews", async () => {
    const { estimateAndPackage } = await import(
      "../../src/cross-server-workflows/estimate-and-package.js"
    );
    const outputDir = join(testDir, "package_output");
    const result = await estimateAndPackage({ files: [cubeStl], outputDir });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.manifest).toBe(join(outputDir, "manifest.json"));
    const manifest = JSON.parse(readFileSync(parsed.manifest, "utf-8"));
    expect(manifest.files).toEqual([cubeStl]);
    expect(manifest.estimatedTimeMinutes).toBeDefined();
    expect(manifest.filamentUsageGrams).toBeDefined();
    expect(manifest.slicedProject).toBeTruthy();
    expect(Array.isArray(manifest.previews)).toBe(true);
    expect(parsed.pipeline).toEqual([
      "convert_to_3mf",
      "arrange",
      "orient",
      "estimate",
      "slice",
      "export_png",
      "package",
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run test/cross-server-workflows/estimate-and-package.test.ts`
Expected: FAIL with "Cannot find module '../../src/cross-server-workflows/estimate-and-package.js'"

- [ ] **Step 3: Extract the shared unwrap helper**

```typescript
// src/cross-server-workflows/unwrap.ts
export function unwrapToolEnvelope<T>(envelope: {
  content: { type: "text"; text: string }[];
  isError?: boolean;
}): T {
  const data = JSON.parse(envelope.content[0].text);
  if (envelope.isError) {
    throw new Error(data.error ?? "Cross-server step failed");
  }
  return data as T;
}
```

Update Task 1's `repair-and-slice.ts` to import `unwrapToolEnvelope` from `./unwrap.js` instead of defining its own local `unwrap()` (delete the local copy).

- [ ] **Step 4: Write the implementation**

```typescript
// src/cross-server-workflows/estimate-and-package.ts
import { convertTo3mf } from "../bambu-cli-mcp/tools/convert-to-3mf.js";
import { arrangeProject } from "../bambu-cli-mcp/tools/arrange-project.js";
import { orientProject } from "../bambu-cli-mcp/tools/orient-project.js";
import { estimatePrint } from "../bambu-cli-mcp/tools/estimate-print.js";
import { sliceProject } from "../bambu-cli-mcp/tools/slice-project.js";
import { exportPlatePng } from "../bambu-cli-mcp/tools/export-plate-png.js";
import { unwrapToolEnvelope } from "./unwrap.js";
import { handleToolError } from "../shared/errors.js";
import { toolResult } from "../shared/types.js";
import { mkdir, cp, writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function estimateAndPackage(params: {
  files: string[];
  outputDir: string;
  settings?: { machine?: string; process?: string; filaments?: string[] };
}) {
  try {
    await mkdir(params.outputDir, { recursive: true });

    // 1. Convert
    const converted = unwrapToolEnvelope<{ output: string }>(
      await convertTo3mf({ files: params.files }),
    );

    // 2. Arrange
    const arranged = unwrapToolEnvelope<{ output: string }>(
      await arrangeProject({ project: converted.output }),
    );

    // 3. Orient
    const oriented = unwrapToolEnvelope<{ output: string }>(
      await orientProject({ project: arranged.output }),
    );

    // 4. Estimate — DO NOT read `estimate.output`: estimate-print.ts:54-56 deletes
    // its workspace before returning, so that path is dangling (Decision Driver 2).
    // Only estimatedTimeMinutes/filamentUsageGrams are safe to use from this call.
    const estimate = unwrapToolEnvelope<{
      estimatedTimeMinutes: number | null;
      filamentUsageGrams: number | null;
    }>(await estimatePrint({ project: oriented.output, settings: params.settings }));

    // 5. Slice
    const sliced = unwrapToolEnvelope<{ output: string }>(
      await sliceProject({ project: oriented.output, settings: params.settings }),
    );

    // 6. Export PNGs (best-effort)
    let previews: string[] = [];
    try {
      const pngResult = unwrapToolEnvelope<{ images: string[] }>(
        await exportPlatePng({ project: sliced.output }),
      );
      previews = pngResult.images;
    } catch {
      // PNG export is best-effort, matches create-print-package.ts:83-87 precedent
    }

    // 7. Package
    const packagedProject = join(params.outputDir, "package.3mf");
    await cp(sliced.output, packagedProject);
    const packagedPreviews: string[] = [];
    for (const preview of previews) {
      const dest = join(params.outputDir, preview.split("/").pop()!);
      await cp(preview, dest);
      packagedPreviews.push(dest);
    }

    const manifestPath = join(params.outputDir, "manifest.json");
    const manifest = {
      files: params.files,
      estimatedTimeMinutes: estimate.estimatedTimeMinutes,
      filamentUsageGrams: estimate.filamentUsageGrams,
      slicedProject: packagedProject,
      previews: packagedPreviews,
    };
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    return toolResult({
      manifest: manifestPath,
      pipeline: [
        "convert_to_3mf",
        "arrange",
        "orient",
        "estimate",
        "slice",
        "export_png",
        "package",
      ],
    });
  } catch (error) {
    return handleToolError(error);
  }
}
```

- [ ] **Step 5: Register `estimate_and_package` in the shared server.ts (completes the Task 1/Task 2 split)**

```typescript
// src/cross-server-workflows/server.ts — extend Task 1's file
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { RepairAndSliceCrossServerSchema, EstimateAndPackageSchema } from "./schemas.js";
import { repairAndSliceCrossServer } from "./repair-and-slice.js";
import { estimateAndPackage } from "./estimate-and-package.js";

export function registerCrossServerWorkflowTools(server: McpServer): void {
  server.tool(
    "repair_and_slice",
    "Cross-server pipeline: inspect -> repair -> convert to 3MF -> arrange -> orient -> slice. Requires --server both.",
    RepairAndSliceCrossServerSchema.shape,
    async (params) => repairAndSliceCrossServer(params),
  );

  server.tool(
    "estimate_and_package",
    "Cross-server pipeline: convert -> arrange -> orient -> estimate -> slice -> export PNGs -> package. Requires --server both.",
    EstimateAndPackageSchema.shape,
    async (params) => estimateAndPackage(params),
  );
}
```

Also extend Task 1 Step 7's `test/server-selection.test.ts` case to assert `estimate_and_package` is listed under `--server both` and absent under `--server bambu`/`--server geometry`.

- [ ] **Step 6: Typecheck, then run test to verify it passes**

Run: `pnpm lint` (`tsc --noEmit`) — expect PASS.
Run: `pnpm vitest run test/cross-server-workflows/estimate-and-package.test.ts`
Expected: PASS (requires `BAMBU_STUDIO_PATH`; skip in CI if unavailable, same as Task 1)

- [ ] **Step 7: Run full test suite**

Run: `pnpm test`
Expected: PASS, no regressions.

- [ ] **Step 8: Commit**

```bash
git add src/cross-server-workflows/ test/cross-server-workflows/
git commit -m "feat: implement estimate_and_package cross-server workflow"
```

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Both new tools require a real BambuStudio CLI install to test end-to-end | High | Medium | Tests use `it.skipIf(!process.env.BAMBU_STUDIO_PATH)`; smoke-test the MCP registration (tool list) without invoking the CLI |
| Temp-dir accumulation from un-cleaned `Workspace` instances inside each chained `bambu-cli-mcp` tool call (pre-existing issue, not caused by this plan) | Medium | Low | Out of scope for this plan; file a follow-up chore bead if it becomes a real disk-usage problem |
| `unwrapToolEnvelope` silently mis-typechecks if an envelope shape changes upstream | Low | Medium | Keep the generic type param explicit at every call site (as shown in Task 2 Step 4) so a shape mismatch fails at the `JSON.parse`/property-access site with a clear runtime error |

## Verification Steps

1. `pnpm lint` (`tsc --noEmit`) after EVERY task — new in v2, this is the gate that catches the tuple/array envelope mismatch `pnpm test` alone would miss.
2. `pnpm vitest run test/cross-server-workflows/` — both new test files pass
3. `pnpm vitest run test/server-selection.test.ts` — confirms tool registration is `--server both`-only
4. `pnpm test` — full suite, no regressions
5. Manual smoke test: `echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node dist/index.js --server both` lists `repair_and_slice` and `estimate_and_package`

## ADR

**Decision:** Add cross-server Phase 5 workflows as a new `src/cross-server-workflows/` module that calls existing `bambu-cli-mcp` and `cad-geometry-mcp` exported functions as black boxes (Option A), rather than refactoring the 6 `bambu-cli-mcp` tool files into engine/tool pairs (Option B).

**Drivers:** additive-only constraint, avoiding regression risk to 11 already-tested tools, matching the literal Phase 5.2/5.4 spec pipelines exactly.

**Alternatives considered:** Option B (extract data-returning core functions from each `bambu-cli-mcp` tool) — rejected as premature generalization for only 2 call sites.

**Why chosen:** Option A satisfies every Global Constraint with zero modification to existing, tested files; the envelope-unwrapping cost is one small shared helper (`unwrapToolEnvelope`), not a structural change.

**Consequences:** Any 3rd future cross-server workflow will also need `unwrapToolEnvelope`; if a 4th appears, revisit Option B. The pre-existing temp-dir-leak in `bambu-cli-mcp` tools is inherited by these workflows (now chained 5-7x per call) — worth a follow-up chore bead if disk usage becomes an issue in practice.

**Follow-ups:** Consider a follow-up chore to add `finally { workspace.cleanup() }` to the 6 `bambu-cli-mcp` tool files (out of scope here, Option B territory) — note this would flip `estimate-print.ts` from "cleans up, dangling output" to consistent with the other 5, which is a behavior-neutral fix for THIS plan (we never read its `output` field) but worth flagging for whoever picks up that follow-up. A Critic review of this v2 revision is still recommended before implementation — the paired review was interrupted by a session boundary before it returned.

## Changelog

- v1: Initial draft (Planner).
- v2 (this revision): Architect review (round 1) found the envelope type used throughout v1 (`content: [{type:"text",text:string}]`, a tuple) does not match the real return shape of `toolResult`/`toolError` (`src/shared/types.ts:7-11`, an array) — this fails `tsc` at every call site, and `pnpm test` (vitest/esbuild) does not typecheck, so v1's own verification steps would have reported PASS on a broken build. Also found: Decision Driver 2 incorrectly claimed `estimate-print.ts` never cleans up its workspace — it does, meaning `estimatePrint`'s `output` field is dangling by the time the caller sees it, not merely leaked-but-usable; and Task 1 Step 6 created `server.ts` importing `estimate-and-package.js` before Task 2 creates that file, breaking Task 1's own standalone build/test. Fixed in this revision: all envelope types corrected to arrays, `pnpm lint` added to every task's verification, `server.ts` registration split correctly across Task 1 (repair_and_slice only) and Task 2 (adds estimate_and_package), and the dangling `estimate.output` field is now an explicit commented invariant instead of an accidental correctness. A Critic review of this v2 is still recommended before implementation.
