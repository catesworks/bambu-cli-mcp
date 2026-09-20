# bambu-cli-mcp — Implementation Plan

**Created**: 2026-05-09
**Status**: Approved
**Updated**: 2026-05-09 (pnpm + Node.js geometry worker + bun compilation)
**Scope**: Two MCP servers — `bambu-cli-mcp` (slicer/project orchestration) and `cad-geometry-mcp` (mesh/CAD geometry operations)

---

## Requirements Summary

Build two complementary MCP servers that expose a complete 3D-printing pipeline as LLM-callable tools:

1. **bambu-cli-mcp** — wraps BambuStudio CLI (v02.06.01.55, installed at `/Applications/BambuStudio.app/Contents/MacOS/BambuStudio`) to provide orientation, arrangement, slicing, 3MF/STL export, settings management, and project packaging
2. **cad-geometry-mcp** — provides mesh inspection, repair, scaling, splitting, connector generation, and assembly manifest output via a Node.js geometry worker using `manifold-3d` (WASM) for booleans/transforms and native STL I/O, with optional FreeCAD/Blender Python adapters in Phase 4

Both servers use the MCP TypeScript SDK (`@modelcontextprotocol/sdk` v1.29.0) with `stdio` transport. Package management via **pnpm**. Build target: **bun** single-file executable compilation for zero-dependency distribution.

---

## Environment Facts (Verified 2026-05-09)

| Resource | Status | Detail |
|----------|--------|--------|
| BambuStudio CLI | Installed | `/Applications/BambuStudio.app/Contents/MacOS/BambuStudio` v02.06.01.55 |
| Node.js | Installed | v24.1.0 (nvm) |
| npm | Installed | v11.6.4 |
| pnpm | **Required** | Install via `npm i -g pnpm` if not present |
| bun | **Required** | For single-file executable compilation |
| manifold-3d | **Available** | WASM bindings for mesh booleans/transforms |
| Python | Installed | 3.12.4 (pyenv) — only needed for Phase 4 CAD adapters |
| FreeCAD CLI | **Not installed** | Phase 4 (optional) |
| Blender CLI | **Not installed** | Phase 4 (optional) |
| MCP SDK | Available | `@modelcontextprotocol/sdk` v1.29.0 |
| Repo state | Blank | Only README.md + .omc/ |

### BambuStudio CLI — Verified Capabilities

Flags confirmed from `--help` output (superset of wiki):

**Input/Loading:**
- `--load-settings "machine.json;process.json"` — load machine + process config
- `--load-filaments "filament1.json;filament2.json;..."` — load filament configs
- `--load-filament-ids "1,2,3,1"` — assign filament IDs per object
- `--load-assemble-list assemble_list.json` — load assembly config
- `--load-custom-gcodes custom_gcode.json` — load custom gcode
- `--load-slicedata directory` — load cached slice data
- `--load-defaultfila option` — default filament for unloaded slots

**Transforms:**
- `--arrange option` — 0=disable, 1=enable, others=auto
- `--orient` — 0=disable, 1=enable, others=auto
- `--scale factor` — float multiplier
- `--rotate` / `--rotate-x` / `--rotate-y` — rotation in degrees
- `--ensure-on-bed` — lift objects above bed
- `--allow-rotations` — allow rotations during arrange
- `--convert-unit` — convert model units
- `--clone-objects "1,3,1,10"` — clone objects
- `--skip-objects "3,5,10,77"` — skip objects in print
- `--repetitions count` — repeat whole model
- `--assemble` — merge models into single plate

**Export:**
- `--export-3mf filename.3mf` — export as 3MF
- `--export-stl` — export as single STL
- `--export-stls` — export as multiple STLs to directory
- `--export-png option` — 0=all plates, i=plate i
- `--export-settings settings.json` — export config
- `--export-slicedata directory` — export slice data

**Slicing:**
- `--slice option` — 0=all plates, i=specific plate

**Info/Debug:**
- `--info` — output model information
- `--camera-view angle` — PNG view angle (0=Iso, 1=Top_Front, 2=Left, 3=Right, 10-12=Iso variants)
- `--pipe pipename` — stream progress to named pipe
- `--debug level` — 0=fatal through 5=trace

**Settings Priority:** CLI args > `--load-settings` files > embedded 3MF values

**Not available via CLI:** Boolean mesh splitting, connector generation, mesh repair, watertight checking, parametric CAD operations. These confirm the need for `cad-geometry-mcp`.

---

## Acceptance Criteria

### bambu-cli-mcp
1. `inspect_bambu_cli` returns BambuStudio version, path, and available flags — verified by calling the tool and checking output contains `BambuStudio-02.06.01`
2. `convert_to_3mf` accepts 1+ STL paths, calls CLI with `--export-3mf`, returns output path — verified by producing a valid .3mf from a test STL
3. `arrange_project` accepts a .3mf, calls CLI with `--arrange 1 --allow-rotations --ensure-on-bed`, returns arranged .3mf path — verified by diff of input/output .3mf
4. `orient_project` accepts a .3mf, calls CLI with `--orient 1`, returns oriented .3mf path
5. `slice_project` accepts .3mf + settings/filament JSON paths, calls CLI with `--slice 0 --load-settings --load-filaments --export-3mf`, returns sliced .3mf — verified by output file containing slice data
6. `export_plate_png` accepts .3mf + plate index + camera view, calls CLI with `--export-png`, returns PNG path — verified by PNG file existing and being >0 bytes
7. `export_stls` accepts .3mf, calls CLI with `--export-stls`, returns list of STL paths
8. `export_settings` accepts optional .3mf, calls CLI with `--export-settings`, returns JSON
9. `validate_project` accepts .3mf, calls CLI with `--info`, parses output for errors/warnings
10. `estimate_print` accepts .3mf + settings, runs slice in estimate mode, extracts time/filament usage
11. `create_print_package` orchestrates arrange → orient → slice → export PNG → bundle output
12. All tools return structured MCP `content` with `type: "text"` JSON payloads
13. Errors from CLI stderr are caught and returned as `isError: true` MCP results
14. Each tool validates inputs with Zod schemas before CLI invocation
15. Workspace manager creates isolated temp dirs per job, cleans up on completion or error

### cad-geometry-mcp (Phase 2+)
16. `inspect_mesh` returns bounds, triangle count, watertight status, volume — verified against known test STL
17. `repair_mesh` fixes non-manifold edges, fills holes — verified by watertight check before/after
18. `scale_mesh` multiplies by factor, returns new STL — verified by bounds ratio matching factor
19. `split_mesh` divides model by grid/planes into parts fitting build volume — verified by each part fitting within specified bounds
20. `add_dowel_connectors` generates male/female dowel holes on split seams — verified by mesh diff showing new geometry at seam boundaries
21. `generate_assembly_manifest` produces JSON manifest with parts, neighbors, connectors, hardware

---

## Architecture

```
┌─────────────────────────────┐
│  LLM Client (Claude, etc.)  │
└─────────────┬───────────────┘
              │ MCP (stdio)
    ┌─────────┴──────────┐
    ▼                    ▼
┌────────────┐   ┌───────────────┐
│bambu-cli-  │   │cad-geometry-  │
│    mcp     │   │     mcp       │
│            │   │               │
│ TypeScript │   │  TypeScript   │
│ MCP Server │   │  MCP Server   │
│            │   │               │
│ ┌────────┐ │   │ ┌───────────┐ │
│ │BambuCLI│ │   │ │manifold-3d│ │
│ │Adapter │ │   │ │  (WASM)   │ │
│ └───┬────┘ │   │ └───────────┘ │
│     │      │   │ ┌───────────┐ │
│  execa     │   │ │STL Parser │ │
│  spawn     │   │ │ (native)  │ │
└─────┼──────┘   └───────┼───────┘
      │                  │
      ▼                  ▼
 BambuStudio        In-process
    CLI             (no subprocess)
                        │
                   Phase 4 only:
                   FreeCAD/Blender
                   (Python subprocess)
```

### Repo Layout

```
bambu-cli-mcp/
├── package.json                     # pnpm workspace root
├── pnpm-workspace.yaml
├── tsconfig.json
├── tsconfig.build.json
├── vitest.config.ts
├── docs/
│   ├── adr/
│   │   ├── 001-pnpm-monorepo.md
│   │   ├── 002-node-geometry-worker.md
│   │   ├── 003-bun-compilation.md
│   │   └── 004-mcp-server-architecture.md
│   └── setup.md
├── src/
│   ├── index.ts                     # Entry point, --server bambu|geometry|both
│   ├── bambu-cli-mcp/
│   │   ├── server.ts                # MCP server setup + tool registration
│   │   ├── tools/
│   │   │   ├── inspect-bambu-cli.ts
│   │   │   ├── convert-to-3mf.ts
│   │   │   ├── arrange-project.ts
│   │   │   ├── orient-project.ts
│   │   │   ├── slice-project.ts
│   │   │   ├── export-plate-png.ts
│   │   │   ├── export-stls.ts
│   │   │   ├── export-settings.ts
│   │   │   ├── validate-project.ts
│   │   │   ├── estimate-print.ts
│   │   │   └── create-print-package.ts
│   │   ├── adapters/
│   │   │   └── bambu-studio-cli.ts  # Spawn/exec wrapper, stderr capture
│   │   └── schemas/
│   │       └── tools.ts             # Zod schemas for all tool inputs
│   ├── cad-geometry-mcp/
│   │   ├── server.ts
│   │   ├── tools/
│   │   │   ├── inspect-mesh.ts
│   │   │   ├── repair-mesh.ts
│   │   │   ├── scale-mesh.ts
│   │   │   ├── split-mesh.ts
│   │   │   ├── add-connectors.ts
│   │   │   └── generate-assembly-manifest.ts
│   │   ├── engines/
│   │   │   ├── manifold-engine.ts   # manifold-3d WASM operations
│   │   │   ├── stl-io.ts           # Binary/ASCII STL read/write
│   │   │   └── cad-subprocess.ts   # Phase 4: FreeCAD/Blender Python bridge
│   │   └── schemas/
│   │       └── tools.ts
│   └── shared/
│       ├── workspace.ts             # Temp dir lifecycle, path safety
│       ├── errors.ts                # MCP error formatting
│       └── types.ts                 # Shared TypeScript types
├── profiles/
│   ├── printers/
│   │   └── bambu_x1e.json
│   ├── process/
│   │   └── petg_strong_030.json
│   └── filament/
│       └── petg.json
├── test/
│   ├── fixtures/
│   │   └── test-cube.stl            # Simple watertight test mesh
│   ├── bambu-cli-mcp/
│   │   ├── bambu-studio-cli.test.ts
│   │   ├── tools.test.ts
│   │   └── workspace.test.ts
│   └── cad-geometry-mcp/
│       ├── manifold-engine.test.ts
│       └── tools.test.ts
└── examples/
    └── rc-ramp.workflow.json
```

### Key Design Decisions

1. **Monorepo, two servers, one `index.ts`** — Both MCP servers live in one repo. `index.ts` accepts `--server bambu|geometry|both` to choose which to start. This simplifies development while allowing independent deployment.

2. **`execa` for BambuStudio CLI** — Provides promise-based child process with timeout, signal handling, and stderr capture. Better than raw `child_process` for CLI wrapping.

3. **Node.js geometry worker with `manifold-3d` WASM** — All geometry operations (inspect, repair, scale, split, connectors) run in-process using `manifold-3d` for booleans/transforms and native binary STL parsing. No Python dependency for Phases 1-3. Single language, single runtime, bundleable to one binary via `bun build --compile`.

4. **Workspace isolation** — Each job gets a temp directory under `os.tmpdir()/bambu-mcp-{uuid}/`. Subdirs: `source/`, `processed/`, `output/`, `logs/`. Workspace is cleaned up on job completion or after configurable TTL (default: 1 hour).

5. **Profile files as JSON** — Printer/process/filament profiles are plain JSON files matching BambuStudio's config format. Users can export their own via `export_settings` and reuse them.

---

## Implementation Steps

### Phase 1 — Project Scaffolding & BambuStudio CLI Wrapper

**Goal**: Working MCP server that can invoke BambuStudio CLI and return results.

#### Step 1.1: Initialize TypeScript project
- `pnpm init` with name `bambu-cli-mcp`
- Install deps: `@modelcontextprotocol/sdk@1.29.0`, `execa`, `zod`
- Install dev deps: `typescript`, `vitest`, `@types/node`
- Create `tsconfig.json` (target: ES2022, module: Node16, strict: true)
- Create `vitest.config.ts`
- Add scripts: `build`, `dev`, `test`, `start`, `bundle` (bun build --compile)
- Create `docs/adr/` directory with initial ADR documents

#### Step 1.2: Build BambuStudio CLI adapter (`src/bambu-cli-mcp/adapters/bambu-studio-cli.ts`)
- Function `findBambuStudio(): string` — locate binary (check `/Applications/BambuStudio.app/Contents/MacOS/BambuStudio`, then `$BAMBU_STUDIO_PATH`, then `which bambu-studio`)
- Function `runBambuStudio(args: string[], opts?: { cwd?: string, timeout?: number }): Promise<{ stdout: string, stderr: string, exitCode: number }>` — wraps `execa` with 5-minute default timeout
- Parse and return structured output (stdout lines, stderr warnings/errors)
- Handle CLI exit codes: 0=success, non-zero=error with stderr context

#### Step 1.3: Build workspace manager (`src/shared/workspace.ts`)
- `createWorkspace(): Promise<Workspace>` — creates temp dir with `source/`, `processed/`, `output/`, `logs/` subdirs
- `Workspace.resolve(subdir, filename): string` — safe path resolution (no path traversal)
- `Workspace.cleanup(): Promise<void>` — removes temp dir
- `Workspace.copyInput(sourcePath): Promise<string>` — copies user file into workspace `source/`

#### Step 1.4: Implement `inspect_bambu_cli` tool
- Calls `BambuStudio --help` and parses version from first line
- Returns `{ version, path, availableFlags: string[] }`
- Register as MCP tool with Zod input schema (no required params)

#### Step 1.5: Implement `export_settings` tool
- Input: optional `project` (path to .3mf)
- Calls `BambuStudio --export-settings output.json [project.3mf]`
- Returns parsed JSON settings

#### Step 1.6: Implement `convert_to_3mf` tool
- Input: `files` (string[], paths to STL/OBJ), optional `output` filename
- Calls `BambuStudio file1.stl file2.stl --export-3mf output.3mf --outputdir workspace/output/`
- Returns `{ output: "path/to/output.3mf" }`

#### Step 1.7: Implement `arrange_project` and `orient_project` tools
- `arrange_project`: Input .3mf, calls `--arrange 1 --allow-rotations --ensure-on-bed --export-3mf`
- `orient_project`: Input .3mf, calls `--orient 1 --export-3mf`
- Both return path to modified .3mf

#### Step 1.8: Implement `slice_project` tool
- Input: `project` (.3mf path), `plate` (number, 0=all), `settings` (object with machine/process/filament JSON paths)
- Calls `BambuStudio project.3mf --load-settings "machine.json;process.json" --load-filaments "filament.json" --slice 0 --export-3mf output.3mf`
- Returns `{ output: "path/to/sliced.3mf" }`

#### Step 1.9: Implement `export_plate_png` tool
- Input: `project` (.3mf), `plate` (number, 0=all), optional `cameraView` (0-12)
- Calls `BambuStudio project.3mf --export-png <plate> --camera-view <angle> --outputdir workspace/output/`
- Returns `{ images: ["path/to/plate_1.png", ...] }`

#### Step 1.10: Implement `export_stls` tool
- Input: `project` (.3mf path)
- Calls `BambuStudio project.3mf --export-stls --outputdir workspace/output/`
- Returns `{ files: ["part1.stl", "part2.stl", ...] }`

#### Step 1.11: Implement `validate_project` tool
- Input: `project` (.3mf path)
- Calls `BambuStudio project.3mf --info`
- Parses stdout for model dimensions, triangle count, plate count, warnings
- Returns structured validation result

#### Step 1.12: Implement `estimate_print` tool
- Input: `project` (.3mf), settings (machine/process/filament)
- Runs slice with `--estimate-mode`, parses output for time/filament estimates
- Returns `{ estimatedTimeMinutes, filamentUsageGrams, plates }`

#### Step 1.13: Implement `create_print_package` tool
- Orchestration tool: calls arrange → orient → slice → export PNG in sequence
- Input: `files` (STL paths), `settings`, `options` (arrange, orient, slice flags)
- Returns `{ project3mf, sliced3mf, previews: [], workspace }`

#### Step 1.14: Wire up MCP server (`src/bambu-cli-mcp/server.ts`)
- Create `McpServer` instance with name "bambu-cli-mcp", version from package.json
- Register all tools with `server.tool(name, schema, handler)`
- Connect via `StdioServerTransport`

#### Step 1.15: Write tests for Phase 1
- Unit tests for CLI adapter (mock execa)
- Unit tests for workspace manager (real fs, temp dirs)
- Integration tests for each tool (mock CLI output, verify argument construction)
- One E2E smoke test with real BambuStudio CLI + test STL (skip in CI)

#### Step 1.16: Add MCP client config example
- Create example `claude_desktop_config.json` snippet showing how to register the server
- Update README.md with setup instructions

---

### Phase 2 — Node.js Geometry Engine (manifold-3d)

**Goal**: In-process geometry operations using `manifold-3d` WASM and native STL I/O. No Python dependency.

#### Step 2.1: Add geometry dependencies
- `pnpm add manifold-3d` — WASM port of the C++ Manifold library (booleans, transforms, mesh ops)
- Build STL I/O module (`src/cad-geometry-mcp/engines/stl-io.ts`) — binary STL parser/writer using Node.js Buffer

#### Step 2.2: Build Manifold engine adapter (`src/cad-geometry-mcp/engines/manifold-engine.ts`)
- `ManifoldEngine` class: wraps `manifold-3d` API
- `loadMesh(stlPath): Promise<Manifold>` — read STL, create Manifold from vertices/faces
- `exportMesh(manifold, outputPath): Promise<void>` — extract mesh, write to binary STL
- `inspect(manifold): MeshInfo` — bounds, volume, surface area, triangle count, genus (watertight if genus=0)
- `scale(manifold, factor): Manifold`
- `split(manifold, plane): [Manifold, Manifold]` — split via intersection with half-spaces
- `boolean(a, b, op): Manifold` — union, difference, intersection

#### Step 2.3: Implement `inspect_mesh` tool
- Load STL via stl-io, create Manifold, return `{ bounds: [x,y,z], triangleCount, volume, watertight, units: "mm" }`

#### Step 2.4: Implement `repair_mesh` tool
- Manifold constructor auto-repairs on import (fixes normals, merges vertices, removes degenerate faces)
- Re-export to new STL
- Return `{ output, watertightBefore, watertightAfter, trianglesBefore, trianglesAfter }`

#### Step 2.5: Implement `scale_mesh` tool
- `manifold.scale([factor, factor, factor])`, export to new STL
- Return `{ output, originalBounds, newBounds, scaleFactor }`

#### Step 2.6: Implement `split_mesh` tool
- Input: STL path, build volume `[x, y, z]`, strategy (`min_parts` | `grid`), optional preferred layout
- Compute bounding box, determine grid cuts needed
- For each cut plane: `manifold.trimByPlane()` to split into two halves
- Export each piece as numbered STL
- Return `{ parts: [{ id, file, bounds, fitsVolume }], totalParts, strategy }`

#### Step 2.7: Implement `lay_flat` tool
- Analyze mesh geometry to find largest planar face
- Apply rotation so that face aligns with Z=0
- Return `{ output, rotationApplied }`

#### Step 2.8: Implement mesh validation
- Check each part fits within build volume
- Check each part is manifold after split (Manifold constructor validates)
- Check no zero-volume or degenerate parts
- Return validation report

#### Step 2.9: Wire up cad-geometry-mcp server
- Register all geometry tools
- No subprocess lifecycle management needed (in-process)

#### Step 2.10: Write tests for Phase 2
- Unit tests for stl-io (read/write roundtrip with known geometry)
- Unit tests for manifold engine (split, boolean, scale)
- Integration tests for geometry tools via MCP
- Verify bun compilation still works with manifold-3d WASM

---

### Phase 3 — Connector Engine

**Goal**: Generate dowel/bolt/heat-insert connectors on split seams using manifold-3d booleans.

#### Step 3.1: Implement seam detection
- Given split parts and their original positions, identify shared faces/edges between neighbors
- Build adjacency graph: part A neighbors [B, D], etc.
- Return seam data: `{ seam: "A-B", plane, area, centroid }`

#### Step 3.2: Implement dowel connector generation
- Input: seam data, connector spec `{ diameter, depth, clearance, count }`
- For each seam: distribute `count` dowel positions evenly along seam
- Male side: cylindrical protrusion (diameter, depth) via `Manifold.cylinder()` + `union()`
- Female side: cylindrical hole (diameter + clearance, depth + 1mm) via `Manifold.cylinder()` + `difference()`
- Return modified parts + connector manifest

#### Step 3.3: Implement bolt channel generation
- Input: seam data, bolt spec `{ boltDiameter, headDiameter, length }`
- Generate through-hole on one side, counterbore on the other
- Return modified parts

#### Step 3.4: Implement heat-insert pocket generation
- Input: seam data, insert spec `{ outerDiameter, depth }`
- Generate pocket on one side, through-hole on the other
- Return modified parts

#### Step 3.5: Implement `generate_assembly_manifest`
- Aggregate all parts, seams, connectors, hardware list
- Output JSON manifest per the spec format
- Include file paths, neighbor relationships, connector details

#### Step 3.6: Write tests for Phase 3
- Test seam detection with known split geometry
- Test connector placement math
- Test manifold integrity after boolean operations
- Test manifest schema validation

---

### Phase 4 — CAD Engine Adapters

**Goal**: Add FreeCAD, Fusion, Blender adapters for parametric/heavy operations.

#### Step 4.1: FreeCAD adapter
- Python adapter using FreeCAD's Python API
- Operations: parametric splitting (Part.Cut), precise connector generation, STEP/IGES import
- Requires FreeCAD installed (`brew install --cask freecad` or AppImage)

#### Step 4.2: Fusion 360 adapter
- Python adapter using Fusion 360's scripting API
- Operations: parametric modeling, precise booleans, timeline-based operations
- Requires Fusion 360 installed and scripting enabled

#### Step 4.3: Blender adapter
- Python adapter using Blender's `bpy` module in background mode
- Operations: mesh booleans, remeshing, mesh cleanup
- Fallback for when FreeCAD/Fusion unavailable
- `blender --background --python script.py`

#### Step 4.4: Engine selection logic
- `inspect_mesh` returns `recommendedEngines` based on mesh complexity and available engines
- Tools accept optional `engine` parameter to override default selection
- Priority: Fusion > FreeCAD > Blender > trimesh

---

### Phase 5 — Agent Workflows

**Goal**: High-level orchestration tools that chain multiple operations.

#### Step 5.1: `make_printable_large_model` workflow tool
- Input: STL path, printer, scale factor
- Pipeline: inspect → scale → repair → split → connectors → prepare bambu project → slice → export previews → manifest

#### Step 5.2: `repair_and_slice` workflow tool
- Input: STL/3MF path, settings
- Pipeline: inspect → repair → convert to 3MF → arrange → orient → slice

#### Step 5.3: `split_with_connectors` workflow tool
- Input: STL path, build volume, connector spec
- Pipeline: split → add connectors → validate → manifest

#### Step 5.4: `estimate_and_package` workflow tool
- Input: STL paths, settings
- Pipeline: convert → arrange → orient → estimate → slice → export PNGs → package

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| BambuStudio CLI output format changes between versions | Medium | High | Pin to known version in adapter, parse defensively with fallback patterns, add version check in `inspect_bambu_cli` |
| BambuStudio CLI hangs or produces no output on headless macOS | Medium | High | Set 5-minute timeout on all CLI calls, test headless execution early in Phase 1, document any required display server config |
| manifold-3d boolean operations fail on degenerate input meshes | Medium | Medium | Manifold constructor auto-repairs on import; require `repair_mesh` before `split_mesh`; fall back to simpler grid-slice strategy; validate after every boolean |
| manifold-3d WASM doesn't bundle correctly with bun | Medium | High | Test bun compilation early in Phase 2; if WASM bundling fails, use node-based entry point with bun for bambu-cli-mcp only |
| Large STL files (>500MB) cause memory issues | Medium | Medium | Add file size check in `inspect_mesh` with warning; consider streaming STL parser for very large files |
| Path traversal in user-supplied file paths | Low | High | Workspace.resolve() validates paths stay within workspace dir, reject absolute paths outside allowed dirs |
| Connector boolean operations produce non-manifold results | Medium | High | manifold-3d guarantees manifold output by construction; post-boolean validation pass; reduce connector geometry complexity if needed |

---

## Verification Steps

1. **Phase 1 smoke test**: Run `echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node dist/index.js --server bambu` and verify all 11 bambu tools are listed
2. **Phase 1 E2E**: Call `convert_to_3mf` with a test cube STL, then `slice_project` with default settings, verify sliced .3mf output exists and is >0 bytes
3. **Phase 2 smoke test**: Call `inspect_mesh` on test cube, verify bounds = [10, 10, 10], watertight = true
4. **Phase 2 E2E**: Call `scale_mesh` (factor=2) → `split_mesh` (volume [10,10,10]) → verify 8 parts produced, each fitting volume
5. **Phase 3 E2E**: Split a test mesh, add dowel connectors, verify each part has new geometry at seam faces and manifest lists correct neighbor pairs
6. **Full pipeline**: Run the ramp workflow end-to-end (inspect → scale → repair → split → connectors → bambu project → slice → PNG → manifest)

---

## Phase Sequencing

```
Phase 1 ──────────────────► Phase 2 ──────────► Phase 3 ──────────► Phase 4
 Bambu CLI wrapper            manifold-3d         Connector engine     CAD engines
 11 tools                     6 tools             5 tools              3 adapters
 TS only                      TS + WASM           TS + WASM            TS + Python
 pnpm + execa                 manifold-3d         manifold-3d          FreeCAD/Blender
                                                                           │
                              bun compile ◄──── tested at each phase       │
                                                                           ▼
                                                                       Phase 5
                                                                       Workflows
                                                                       4 orchestration tools
```

**Phase 1 is the critical path** — it proves the CLI integration pattern and establishes the MCP server structure that all subsequent phases build on. Start here.
