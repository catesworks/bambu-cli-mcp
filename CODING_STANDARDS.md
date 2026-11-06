# Coding Standards

This document defines the style and conventions used in `bambu-cli-mcp`.
All contributions should follow these rules unless otherwise noted.

The rules come from the code that already exists in the repo. Each rule names
a real file as its example. Where the repo does not do something yet, the rule
is marked **(aspirational)**. Section 9 lists the places where the code
disagrees with itself, with counts.

## Scope

| Area | Language | Where | Covered by |
| --- | --- | --- | --- |
| MCP servers | TypeScript (ESM, Node) | `src/`, 32 files | Sections 1-7 |
| Tests | TypeScript (Vitest) | `test/`, 9 files | Section 7 |
| Docs site | TypeScript/TSX, CSS, MDX (Docusaurus 3) | `docs-site/` | Section 3.4 |
| Docs and ADRs | Markdown | `README.md`, `docs/`, `docs-site/docs/` | Section 4.3 |
| Examples | JSON | `examples/*.json` | Section 2.4 |
| CI | GitHub Actions YAML | `.github/workflows/` | Section 6.3 |

The repo has no ESLint, Prettier, Biome or `.editorconfig` config. The only
automated checks are `tsc` (strict mode) and the Vitest suite. Everything else
in this document is held in place by review alone.

## 1. General Code Style

- Favor clarity over brevity. Name each pipeline step after the domain action,
  for example `scaleMesh`, `splitMesh`, `addDowelConnectors`.
- Keep MCP tool handlers thin. A tool file validates nothing itself (Zod does
  that), calls an adapter or engine, and wraps the result. See
  `src/cad-geometry-mcp/tools/inspect-mesh.ts` (12 lines).
- Put the real work in the layer below the tool:
  - BambuStudio work goes through `runBambuStudio()` in
    `src/bambu-cli-mcp/adapters/bambu-studio-cli.ts`.
  - Geometry work goes through the engines in `src/cad-geometry-mcp/engines/`.
  - Code shared by both servers lives in `src/shared/`.
- Workflow tools call engine functions directly. They never call other MCP
  tools (ADR 006, `src/cad-geometry-mcp/tools/workflows.ts`).
- Use ES modules only. `package.json` sets `"type": "module"`, and
  `tsconfig.json` uses `"module": "Node16"`.
- Write every relative import with a `.js` extension. All 109 relative imports
  in `src/` and `test/` do this, for example
  `import { toolResult } from "../../shared/types.js";`.
- Import Node built-ins with the `node:` prefix (37 of 37 imports), for example
  `import { join } from "node:path";`.
- Remove unused code. Today `selectEngine()` in
  `src/cad-geometry-mcp/engines/cad-subprocess.ts` and `Workspace.copyInput()`
  / `listOutputs()` have no callers in `src/` (the last two are used in tests).

## 2. Naming Conventions

| Item | Convention | Example |
| --- | --- | --- |
| Source files | `kebab-case.ts` | `create-print-package.ts`, `manifold-engine.ts` |
| Test files | `<source-name>.test.ts` | `test/cad-geometry-mcp/stl-io.test.ts` |
| Variables, params | `camelCase` | `buildVolume`, `outputDir`, `countPerSeam` |
| Functions | `camelCase()`, verb first | `findBambuStudio()`, `detectSeams()` |
| Module constants | `UPPER_SNAKE_CASE` | `DEFAULT_TIMEOUT`, `BYTES_PER_TRIANGLE`, `MAX_ITERATIONS` |
| Classes | `PascalCase` | `Workspace`, `BambuCliError` |
| Interfaces, types | `PascalCase` | `MeshInfo`, `SplitResult`, `CadEngineInfo` |
| Zod schemas | `PascalCase` + `Schema` | `SliceProjectSchema`, `AddConnectorsSchema` |
| MCP tool names | `snake_case`, verb first | `slice_project`, `add_dowel_connectors` |
| MCP server names | `kebab-case` | `bambu-cli-mcp`, `cad-geometry-mcp`, `bambu-cli-mcp-combined` |
| Output part files | `part_<id>.stl` | `part_A.stl` (`splitMesh` in `manifold-engine.ts`) |

### 2.1 Units in names

Put the unit at the end of a numeric field name when the unit matters:
`diameterMm`, `depthMm`, `clearanceMm` (`src/cad-geometry-mcp/schemas/tools.ts`),
`estimatedTimeMinutes`, `filamentUsageGrams`
(`src/bambu-cli-mcp/tools/estimate-print.ts`). Lengths without a suffix are
millimetres. `inspectMesh` reports `units: "mm"`.

### 2.2 Tool files and handler functions

- One tool per file in `tools/`, named after the tool with hyphens:
  `slice_project` lives in `slice-project.ts`. Two exceptions exist:
  `add_dowel_connectors` lives in `add-connectors.ts`, and the four workflow
  tools share `workflows.ts`.
- Handler names:
  - BambuStudio tools use the plain camelCase tool name: `sliceProject`,
    `inspectBambuCli`.
  - Core geometry tools add a `Tool` suffix, because the engine function
    already has the plain name: `inspectMeshTool` wraps `inspectMesh`.
  - Workflow tools use the plain name: `makePrintableLargeModel`.

### 2.3 Booleans

Name booleans as a state or a question: `watertight`, `fitsVolume`,
`available`, `allowRotations`, `ensureOnBed`, `aHasGeometry`.

### 2.4 JSON keys

JSON that tools return or write uses `camelCase` keys: `triangleCount`,
`totalParts`, `generatedAt`, `malePartId`. The files in `examples/` follow
the same rule (`buildVolume`, `countPerSeam`).

## 3. Formatting Rules

No formatter config is checked in. These are the conventions the code follows
today:

- Indentation: **2 spaces**. No tabs anywhere in `src/` or `test/`.
- Quotes: **double quotes** in `src/` and `test/` (164 double-quoted imports,
  0 single-quoted).
- Semicolons: always.
- Trailing commas: on every multi-line argument list, array and object
  (136 of 137 multi-line closers).
- Arrow functions: always wrap the parameter in parentheses, even when there
  is one: `(f) => f.endsWith(".stl")` (15 of 15).
- Line length: keep lines under 80 characters where you can. 55 lines go over
  80, and 6 go over 100. The longest ones are tool descriptions in
  `src/cad-geometry-mcp/server.ts`. **(aspirational)** No tool enforces a
  limit.
- Encoding: UTF-8, LF line endings, newline at end of file (all files comply).
  Some descriptions use `→` (`server.ts`), so the files are not ASCII-only.

### 3.1 Braces

K&R style: the opening brace stays on the same line.

```ts
if (params.allowRotations !== false) {
  args.push("--allow-rotations");
}
```

A one-line `if` without braces is allowed for a guard clause that returns or
continues:

```ts
if (cachedPath) return cachedPath;
```

### 3.2 Building CLI arguments

Build BambuStudio arguments as a `string[]`, one flag or value per element.
Push optional flags after the array is created. Convert numbers with
`String()`. See `src/bambu-cli-mcp/tools/export-plate-png.ts`:

```ts
const args: string[] = [
  params.project,
  "--export-png",
  String(plate),
  "--camera-view",
  String(cameraView),
  "--outputdir",
  outputDir,
];
```

Join multi-file BambuStudio values with `;`, as in
`settingsFiles.join(";")` for `--load-settings` (`slice-project.ts`).

### 3.3 Types

- Use `interface` for object shapes (15 in `src/`), for example `MeshInfo`.
- Use `type` for unions and tuples: `ServerMode`, `CadEngine`,
  `type Vec3 = [number, number, number]`.
- Do not use the boxed types `Number`, `String`, `Boolean` or `Object`. Use
  `number`, `string`, `boolean` and `object` (TypeScript handbook, "Do's and
  Don'ts"). The repo already complies.
- Do not use `any`. There are 0 uses in `src/`. Cast unknown third-party
  values through `unknown`, as `getModule()` does in `manifold-engine.ts`.
- Use `import type` for imports that are only types:
  `import type { BambuCliResult } from "../../shared/types.js";`.
- Use union types in place of overloads that differ in one argument
  (TypeScript handbook). For example, `strategy: "min_parts" | "grid"`.
- Keep `strict: true` in `tsconfig.json`.

### 3.4 Docs site (`docs-site/`)

`docs-site/` keeps the Docusaurus scaffold style. It uses **single quotes**
(16 of 16 imports) and no spaces inside braces
(`import type {ReactNode} from 'react';`). This is the opposite of `src/`.
Leave each subproject in its own style, and do not reformat one to match the
other in an unrelated change. CSS uses Infima custom properties
(`--ifm-color-primary`) in `docs-site/src/css/custom.css`, with CSS modules
next to components (`styles.module.css`).

## 4. Comments & Documentation

- Explain *why*, not *what*, unless the intent is unclear. Good examples:
  - `// Manifold constructor auto-repairs: fixes normals, merges vertices, ...`
    (`manifold-engine.ts`)
  - `// Fusion 360 doesn't have a CLI — scripting is via its internal API`
    (`cad-subprocess.ts`)
- Use numbered step comments in multi-step pipelines: `// 1. Inspect original`,
  `// 2. Scale` (`workflows.ts`) or `// Step 1: Convert + arrange + orient`
  (`create-print-package.ts`).
- Note a deliberate empty `catch` with a comment:
  `// Fall through to default paths`, `// PNG export is best-effort`.
- Use JSDoc (`/** ... */`) on exported engine functions whose behaviour is not
  obvious from the name: `detectSeams`, `addDowelConnectors`, `stlToIndexed`.
  Only 6 JSDoc blocks exist, all in `engines/`. **(aspirational)** Add JSDoc to
  other exported engine functions as you touch them.
- Comment binary formats and magic numbers where they are declared:
  `const BYTES_PER_TRIANGLE = 50; // 12 normal + 36 vertices + 2 attribute`.
- Each tool's `.describe()` text and `server.tool(...)` description is user
  documentation, because MCP clients show it to the model. Keep it accurate.
- The repo has no `TODO`, `FIXME` or `HACK` markers. Track follow-up work in
  beads (`bd`, see `.beads/`), not in code comments.

### 4.1 Recommended tags

The repo uses none of these today. If you need one, use this form:

```text
NOTE: non-obvious design decision
FIXME: known incorrect behavior (open a bd issue too)
```

### 4.2 Decisions

Record architecture decisions as ADRs in `docs/adr/NNN-slug.md` with
`Status`, `Context`, `Decision`, `Reasoning`, `Consequences` sections
(see `docs/adr/006-workflow-orchestration.md`). Session dossiers go in
`docs/sessions/YYYY-MM-DD-slug/`.

### 4.3 Markdown

- Use ATX headings (`#`, `##`), one `#` title per file.
- Use `-` for bullet lists.
- Use `**bold**` for emphasis (244 uses). Do not use `__bold__`.
- Use fenced code blocks with a language tag (`bash`, `json`, `ts`).
- Use pipe tables for tool lists and parameters (`README.md`).
- Docs pages in `docs-site/docs/` start with YAML front matter
  (`sidebar_position`).

## 5. Error Handling

### 5.1 MCP tool handlers never throw

Every tool handler wraps its body in `try`/`catch`. It returns
`toolResult(data)` on success and `handleToolError(error)` on failure (22 of 22
handlers). Both helpers live in `src/shared/`.

```ts
export async function inspectMeshTool(params: { path: string }) {
  try {
    const info = await inspectMesh(params.path);
    return toolResult(info);
  } catch (error) {
    return handleToolError(error);
  }
}
```

`toolError()` returns `{ error: message }` as JSON text with `isError: true`.
Callers and tests check for `isError` (`test/bambu-cli-mcp/tools.test.ts`).

### 5.2 BambuStudio failures

- Throw `BambuCliError(message, stderr, exitCode)` from the adapter. Do not
  throw it from tools. `handleToolError` adds the `stderr` text to the message.
- `runBambuStudio` calls `execa` with `reject: false` and checks `exitCode`
  itself. Any other error is rethrown as a `BambuCliError`.
- Every CLI call has a timeout. The default is `DEFAULT_TIMEOUT` (5 minutes).

### 5.3 Narrowing unknown errors

Use this exact pattern:

```ts
const message =
  error instanceof Error ? error.message : "Unknown error occurred";
```

### 5.4 Best-effort steps

A step that is allowed to fail gets an empty `catch` with a comment saying so.
Example: PNG export in `create-print-package.ts`, which fails on headless
machines.

### 5.5 Resource cleanup

- **WASM memory:** every `ManifoldInstance` must be freed with `.delete()`
  once it is no longer needed. Use `try`/`finally` when a function returns
  early (`inspectMesh`, `scaleMesh`). Free intermediates in loops at once
  (`if (!a.isEmpty()) results.push(a); else a.delete();`). See ADR 005.
- **manifold-3d setup:** call `instance.setup()` right after `await init()`.
  Without it, `Mesh` and the static constructors are undefined
  (`.claude/memory/feedback_manifold_setup.md`).
- **Workspaces:** a tool that writes only temporary files must call
  `await workspace.cleanup()` in `finally` (`estimate-print.ts`,
  `export-settings.ts`, all three pipelines in `workflows.ts`). A tool that
  returns a path inside its workspace must not clean up, or the path it
  returns would be deleted. See section 9 for the gap this leaves.
- **Paths:** build paths with `join()` from `node:path`.
  `Workspace.resolve()` keeps file names inside the workspace with
  `basename()`.

### 5.6 Logging

The MCP transport is stdio, so writing to stdout breaks the protocol. The only
console call in `src/` is `console.error("Fatal error:", error)` in
`src/index.ts`. Do not add `console.log`.

## 6. Commit & Review Practices

### 6.1 Commits

- Use Conventional Commits: `type(scope): summary`. 21 of the 27 commits follow
  it. Types used: `feat`, `fix`, `docs`, `chore`, `ci`. Scopes used: `ci`,
  `docs`, `beads`.

  ```text
  fix(ci): deploy from repo root, not docs-site, in vercel-deploy
  ```

- Keep the summary short and in the imperative mood. Leave out the trailing
  period (Git style guide). The repo uses a lowercase summary after the type
  prefix, so follow the repo rather than the guide's "capitalized" rule.
- If you add a body, leave a blank line after the summary and wrap at 72
  characters. Explain why the change is needed.
- One logical change per commit.

### 6.2 Branches and reviews

- Branch names are lowercase with hyphens, and may have a type prefix:
  `fix/vercel-deploy-cwd`, `catesworks-standards/vercel-cli-manual-deploy`.
- Changes go through pull requests against `main`. CI must pass first.
- Keep pull requests small.

### 6.3 CI

`.github/workflows/ci.yml` runs on every push and pull request to `main`:

```bash
pnpm install --frozen-lockfile
pnpm run build   # tsc -p tsconfig.build.json
pnpm run lint    # tsc --noEmit (type check only)
pnpm test        # vitest run
```

- CI uses Node 24 and pnpm 10. `package.json` requires Node `>=20.0.0`.
- Use pnpm, not npm or yarn (ADR 001). Commit `pnpm-lock.yaml`.
- Pin GitHub Actions to a major version (`actions/checkout@v4`).
- Vercel deploys of `docs-site` are manual only (`workflow_dispatch`, see
  `docs/sessions/2026-09-14-vercel-manual-deploy/`).

## 7. Tests

- Framework: Vitest (`vitest.config.ts`, `testTimeout: 30_000`,
  `globals: true`). Import `describe`, `it` and `expect` from `"vitest"`
  anyway, as every test file does.
- Layout: `test/` mirrors `src/` (`test/cad-geometry-mcp/`,
  `test/bambu-cli-mcp/`). Shared fixtures go in `test/helpers/`.
- Structure: `describe` per module or function, `it("does X")` per behaviour.
  Use `it`, not `test` (32 of 32).
- Generate fixtures in code. Do not commit binary models.
  `generateTestCubeStl()` in `test/helpers/generate-test-cube.ts` builds a
  10 mm cube.
- Isolate the filesystem. Each suite creates its own folder under `tmpdir()`
  named `bambu-mcp-<suite>-test` in `beforeAll`, and removes it with
  `rmSync(..., { recursive: true, force: true })` in `afterAll`.
- Gate tests that need the real BambuStudio binary with `it.skipIf(...)` on
  `BAMBU_STUDIO_PATH` or `process.platform`
  (`test/bambu-cli-mcp/bambu-studio-cli.test.ts`). The geometry tests need no
  external tools.
- Test MCP tools through their return shape: parse `result.content[0].text`
  and check `result.isError` (`test/cad-geometry-mcp/workflows.test.ts`).
- Tests must be deterministic. Compare floating-point geometry with
  `toBeCloseTo`.
- Write tests for new tools and engine functions.

## 8. Changes to This Guide

Style evolves. Propose improvements by opening a pull request that updates this
document. If the change adds a formatter or linter config, update sections 3
and 9 in the same pull request.

## 9. Inconsistencies Found

These were found by scanning `src/`, `test/` and the docs. The source files
were not changed. The majority convention is listed first, and each outlier
should move to it when that code is next touched.

| # | Category | Majority | Outliers |
| --- | --- | --- | --- |
| 1 | Import order | Local relative imports before `node:` built-ins (8 files, e.g. `tools/export-stls.ts`) | `node:` first in 2 files (`adapters/bambu-studio-cli.ts`, `tools/generate-assembly-manifest.ts`); `src/index.ts` puts `node:`, then packages, then relative |
| 2 | Static vs dynamic import of built-ins | Static top-level `import` | 7 dynamic `await import("node:fs/promises")` / `("node:path")` in `tools/workflows.ts` (6) and `engines/manifold-engine.ts` (1). `workflows.ts` already imports `writeFile` statically from the same module. The dynamic `import("manifold-3d/manifold.js")` is intended (lazy WASM load). |
| 3 | Path building | `join()` | 4 string joins `workspace.resolvePath("processed") + "/split"` in `tools/workflows.ts` |
| 4 | Workspace cleanup | `finally { await workspace.cleanup(); }` in 5 of the functions that create a workspace | 7 BambuStudio tools (`arrange`, `convert`, `orient`, `slice`, `export-plate-png`, `export-stls`, `create-print-package`) never clean up, because they return paths inside the temp folder. Each call leaves a `bambu-mcp-<id>` folder in `tmpdir()`. |
| 5 | Duplicated engine code | One copy of a helper | `ManifoldInstance`, `ManifoldModule`, `Vec3`, `Box`, `getModule()`, `loadStlAsManifold()` and `saveManifoldAsStl()` are declared in both `engines/manifold-engine.ts` and `engines/connectors.ts`. Each file keeps its own `moduleInstance` cache. |
| 6 | Handler name vs tool name | Handler matches the tool name | `repair_and_prepare` uses `RepairAndSliceSchema` and `repairAndSlice()`, but nothing is sliced |
| 7 | Tool file name | File matches the tool name | `add_dowel_connectors` lives in `add-connectors.ts` and uses `AddConnectorsSchema` / `addConnectorsTool` |
| 8 | Param types | Inline `params: { ... }` object type (20 of 20 handlers) | The inline types copy the Zod schemas by hand, so the two can drift. `workflows.ts` uses `ConnectorSpec` in one function and an inline copy in another. |
| 9 | `.describe()` on schema fields | Most fields have one | `CreatePrintPackageSchema.settings.*`, `ensureOnBed`, and the `connector` fields of `MakePrintableLargeModelSchema` / `SplitWithConnectorsSchema` have none |
| 10 | Object type form | `interface` for object shapes (15) | `type Box = { min: Vec3; max: Vec3 }` (2, in both engine files) |
| 11 | Brace style for one-line `if` | Braced blocks (40) | 25 unbraced one-liners. The 4 `if (...) x; else y;` lines in `manifold-engine.ts` are the hardest to read. |
| 12 | Line length | Under 80 characters | 55 lines over 80, 6 over 100 (`tools/workflows.ts:1`, `server.ts:96,103,110`) |
| 13 | Test placement | `test/<area>/` mirrors `src/<area>/` | `test/bambu-cli-mcp/workspace.test.ts` and the `toolResult` / `toolError` tests in `tools.test.ts` cover `src/shared/` |
| 14 | Test imports | Static imports | `tools.test.ts` uses `await import("../../src/shared/types.js")` twice |
| 15 | Type check coverage | `src/` is type checked | `tsconfig.json` excludes `test`, so `pnpm run lint` never type checks the tests |
| 16 | Quote style across subprojects | Double quotes (`src/`, `test/`) | Single quotes in `docs-site/` (Docusaurus scaffold). See section 3.4. |
| 17 | Version string | `package.json` `"version": "0.1.0"` | Hard-coded again in 3 `new McpServer({ version: "0.1.0" })` calls and in `detectEngine` (`"3.4.1 (WASM)"`) |
| 18 | Commit messages | Conventional Commits (21 of 27) | `add prime`, `bd init: ...`, `print large model skill`, `first commit`, `Honor the documented ...`, one merge commit |

### 9.1 Docs that disagree with the code

- `README.md` says "29 tests across 7 files". The suite has 32 `it` cases in
  8 test files.
- `README.md` and `docs/setup.md` list a `profiles/` folder. The repo has none.
- ADR 001 and ADR 004 describe `packages/*` workspaces and a
  `pnpm-workspace.yaml`. The repo is one package, with both servers under
  `src/`.
- `docs-site/docs/tools/*.md` documents tool names that are not registered in
  either `server.ts` (`slice_model`, `arrange_models`, `list_profiles`,
  `orient_model`, `validate_model`, `repair_model`, and others). The pages also
  use `snake_case` parameter names (`diameter_mm`), but the schemas use
  `diameterMm`.
- `docs-site/docs/guides/connectors.md` names parts `part_0`. The code writes
  `part_A`. The guide also says the probe sphere radius is `diameter_mm / 2`.
  `addDowelConnectors` uses a radius of `connector.diameterMm`.

## References

These style guides were fetched and used as context. Where a guide and the
repo disagree, the repo convention wins and the difference is noted above.

- TypeScript Do's and Don'ts: <https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html>
- Node.js Style Guide (felixge): <https://github.com/felixge/node-style-guide>.
  It agrees on 2 spaces, semicolons and same-line braces. It differs on quotes:
  the guide says single, this repo uses double.
- JavaScript conventions (W3Schools): <https://www.w3schools.com/js/js_conventions.asp>
- Markdown Style Guide: <https://cirosantilli.com/markdown-style-guide/>
- Git Style Guide: <https://github.com/agis/git-style-guide>
- The Google JSON style guide link returned 404 and was skipped.
