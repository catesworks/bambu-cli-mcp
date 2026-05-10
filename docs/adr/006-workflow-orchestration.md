# ADR 006: Workflow Tool Patterns for Multi-Step Pipelines

## Status
Accepted

## Context

Individual mesh and slicing tools work well for single operations (inspect a mesh, scale by 2x, repair topology), but users often need complete multi-step pipelines:

- **Large model preparation**: Scale → Repair → Split → Add Connectors → Generate Manifest
- **Mesh preparation**: Inspect → Repair → Lay Flat
- **Splitting with connectors**: Split → Add Connectors → Generate Manifest
- **Engine discovery**: Detect available CAD engines (FreeCAD, Blender, Fusion, manifold)

Implementing these as separate tool calls in sequence requires users to:
1. Call each tool, extract output paths
2. Pass outputs as inputs to next tools
3. Coordinate temporary directories
4. Handle errors at each step
5. Clean up intermediate files

This creates friction and opportunities for error. Creating workflow tools that chain operations reduces round-trips, ensures correct sequencing, and manages intermediate files automatically.

## Decision

Implement **4 workflow tools** as higher-order orchestrations that compose existing engine functions directly (not via MCP tool calls):

### 1. `make_printable_large_model`
**Purpose**: Full pipeline for scaling large models into print-ready parts.

**Steps**:
1. Inspect original (gather bounds, volume, topology info)
2. Scale uniformly
3. Repair (fix normals, merge vertices, validate manifold)
4. Split mesh into parts that fit build volume
5. Add dowel connectors at seams (if multiple parts and connector spec provided)
6. Generate assembly manifest

**Parameters**:
```
input: string                         # Input STL path
scale: number                         # Scale factor (e.g., 2.0)
buildVolume: [number, number, number] # Printer build volume [x, y, z] mm
connector?: {                         # Optional connector spec
  type: "dowel"
  diameterMm: number
  depthMm: number
  clearanceMm: number
  countPerSeam: number
}
outputDir: string                     # Directory for final parts
```

**Returns**:
```
manifest: string                      # Path to assembly manifest JSON
parts: string[]                       # Array of final STL file paths
totalParts: number                    # Number of output parts
pipeline: string[]                    # Steps executed (e.g., ["inspect", "scale", "repair", "split", "connectors"])
```

### 2. `repair_and_prepare`
**Purpose**: Prepare a mesh for printing (repair damage, orient for build plate).

**Steps**:
1. Inspect original
2. Repair mesh (fix topology, validate manifold)
3. Lay flat (rotate so largest face aligns with XY plane for optimal printing)

**Parameters**:
```
input: string      # Input STL path
outputDir: string  # Directory for output files
```

**Returns**:
```
output: string                        # Path to repaired and oriented STL
originalInfo: { ... }                 # Mesh info (vertices, faces, volume)
repair: {
  watertightBefore: boolean
  watertightAfter: boolean
  trianglesBefore: number
  trianglesAfter: number
}
layFlat: {
  rotationApplied: boolean            # Whether rotation was needed
  ...
}
pipeline: string[]                    # ["inspect", "repair", "lay_flat"]
```

### 3. `split_with_connectors`
**Purpose**: Split a model and add alignment connectors in one pass.

**Steps**:
1. Split mesh into parts that fit build volume
2. Add dowel connectors at seams (if multiple parts)
3. Generate assembly manifest

**Parameters**:
```
input: string                         # Input STL path
buildVolume: [number, number, number] # Build volume [x, y, z] mm
connector: {                          # Connector spec
  type: "dowel"
  diameterMm: number
  depthMm: number
  clearanceMm: number
  countPerSeam: number
}
outputDir: string                     # Directory for output files
```

**Returns**:
```
manifest: string                      # Path to assembly manifest JSON
parts: string[]                       # Array of final STL file paths
totalParts: number
connectors: number                    # Count of connectors added
pipeline: string[]                    # ["split", "connectors", "manifest"]
```

### 4. `list_available_engines`
**Purpose**: Detect which CAD/geometry engines are available on the system.

**Parameters**: None

**Returns**:
```
engines: Array<{
  engine: string                      # Name: "manifold" | "freecad" | "blender" | "fusion"
  available: boolean                  # Whether installed and accessible
  version?: string                    # Version if available
  path?: string                       # Path to binary/executable
}>
recommended: string                   # Best available engine for the system
```

## Implementation Patterns

### Workspace Management
Each workflow creates a temporary `Workspace` for intermediate files:

```typescript
const workspace = await Workspace.create();
try {
  // Workflow steps here
  const scaledPath = workspace.resolve("processed", "scaled.stl");
  const repairedPath = workspace.resolve("processed", "repaired.stl");
  // ...

  // Only copy final outputs to user's outputDir
  await cp(finalPath, join(outputDir, filename));
} finally {
  await workspace.cleanup();  // Removes temp directory
}
```

**Benefits**:
- Intermediate files are isolated from user directories
- Automatic cleanup in `finally` block ensures no orphaned temp files
- Each step's output feeds directly to the next (no filesystem latency)

### Composition via Engine Functions
Workflows compose existing engine functions directly, not MCP tool calls:

```typescript
// Direct function composition for efficiency
import { inspectMesh, scaleMesh, repairMesh, splitMesh } from "../engines/manifold-engine.js";
import { addDowelConnectors } from "../engines/connectors.js";

export async function makePrintableLargeModel(params) {
  // Calls engine functions directly, returns result via MCP
  const info = await inspectMesh(params.input);
  const scaleResult = await scaleMesh(params.input, scaledPath, params.scale);
  const repairResult = await repairMesh(scaledPath, repairedPath);
  // ...
}
```

**Why not call MCP tools recursively?**
- MCP is a protocol (JSON-RPC over stdio/pipe); each call has serialization overhead
- Direct function calls are synchronous and can share memory/file handles
- Temporary files stay in workspace; no need to serialize paths through MCP
- Errors propagate naturally; no need to parse error responses

### Error Handling
All workflows delegate error handling to a shared handler:

```typescript
try {
  // Pipeline steps
  return toolResult({ manifest, parts, totalParts, pipeline });
} catch (error) {
  return handleToolError(error);  // Unified error format
} finally {
  await workspace.cleanup();
}
```

### Output to User Directory
Only final outputs are copied to the user-specified `outputDir`:

```typescript
// Intermediate files stay in workspace
const splitDir = workspace.resolvePath("processed") + "/split";    // temp
const connectedDir = workspace.resolvePath("processed") + "/connected"; // temp

// Only final parts copied to outputDir
for (const file of files) {
  if (file.endsWith(".stl")) {
    await cp(join(sourceDir, file), join(params.outputDir, file));
  }
}
```

## Phase 4: CAD Engine Adapter Interface

Beyond Phase 3, workflow tools and engine detection enable **optional CAD engine integration** (Fusion, FreeCAD, Blender) for advanced operations:

### Engine Selection Strategy
Priority-based selection finds the best available engine:

```
Priority: Fusion > FreeCAD > Blender > manifold (WASM always available)
```

Engines are detected at runtime via `which` commands:
- **Fusion 360**: Check `/usr/local/Autodesk/Fusion` (macOS/Linux) or registry (Windows)
- **FreeCAD**: Check `which FreeCAD` or `FreeCADCmd`
- **Blender**: Check `which blender`
- **manifold-3d**: Always available (bundled WASM)

### Manifold as Fallback
Phase 1-3 operations (inspect, repair, scale, split, connectors) are fully implemented in manifold-3d. CAD engines are **optional optimizations**, not requirements.

### Runtime Detection
`detectAllEngines()` (in `cad-subprocess.ts`) returns:

```typescript
interface EngineInfo {
  engine: "manifold" | "freecad" | "blender" | "fusion"
  available: boolean
  version?: string
  path?: string
}
```

This enables workflows to select the best available engine for a given task:

```typescript
const engines = await detectAllEngines();
const bestEngine = engines
  .filter(e => e.available)
  .sort((a, b) => PRIORITY[a.engine] - PRIORITY[b.engine])[0];

// Use bestEngine.path to invoke external tool
// Fall back to manifold-3d if no CAD engines available
```

## Consequences

### Positive
- **Users can run complete pipelines in one tool call**: No need to orchestrate multiple tools
- **Automatic intermediate file management**: Workspace cleanup eliminates manual temp file handling
- **Correct sequencing guaranteed**: Workflow tools enforce correct order; users can't make mistakes (e.g., splitting before repairing)
- **Better error messages**: Each step can fail with context ("scale failed because..." vs. generic MCP error)
- **Efficient composition**: Direct function calls avoid serialization overhead of MCP round-trips
- **Phase 4 ready**: `list_available_engines` provides the foundation for optional CAD engine integration
- **Manifold always available**: Phase 1-3 functionality is guaranteed; CAD engines are optional enhancements
- **Extensible pattern**: New workflows can be added by composing existing engine functions

### Negative
- **More tools to maintain**: 4 workflow tools + 7 core tools = 11 tools in cad-geometry-mcp
- **Less granular control**: Workflows can't skip steps or customize intermediate stages (by design)
- **Harder to debug**: Multi-step failures require tracing through the workflow logic rather than isolating a single step
- **Workspace cleanup timing**: If a process crashes between `workspace.cleanup()` call, temp files may persist (mitigated by unique temp dir names)

## Tool Summary

### Core Tools (7)
1. `inspect_mesh` — Analyze mesh properties
2. `repair_mesh` — Fix topology and validate manifold
3. `scale_mesh` — Uniform or per-axis scaling
4. `split_mesh` — Grid-based partitioning
5. `lay_flat` — Orient for build plate
6. `generate_assembly_manifest` — Create assembly manifest
7. `add_dowel_connectors` — Add alignment connectors

### Workflow Tools (4)
8. `make_printable_large_model` — Full scaling + repair + split + connectors pipeline
9. `repair_and_prepare` — Repair + lay flat pipeline
10. `split_with_connectors` — Split + connectors + manifest pipeline
11. `list_available_engines` — Detect available CAD engines

**Total**: 11 tools in cad-geometry-mcp

## Related Decisions
- ADR 005: manifold-3d WASM Usage Patterns (engine implementation)
- ADR 004: Two-Server Architecture (cad-geometry-mcp is the geometry server)
- ADR 002: Node.js Geometry Worker (server infrastructure)

## Future Considerations

**Phase 4 CAD Engine Integration**:
- Keep manifold-3d for fast in-process operations (inspect, scale, split, repair)
- Add subprocess adapters for Fusion, FreeCAD, Blender (in `cad-subprocess.ts`)
- Workflow tools can select the best available engine based on task and system capabilities
- `list_available_engines` enables users to discover which engines are installed

**New Workflow Tools**:
- `optimize_for_strength`: Scale + reinforce weak areas + split (Phase 4 with FreeCAD)
- `prepare_for_mold_making`: Rotate + split + add undercuts (Phase 4 with Fusion)
- `batch_process_models`: Run `repair_and_prepare` on multiple STL files (Phase 3+)
