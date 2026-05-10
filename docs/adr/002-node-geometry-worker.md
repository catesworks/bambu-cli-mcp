# ADR 002: Use Node.js with manifold-3d WASM for Geometry Operations

## Status
Accepted

## Context
The cad-geometry-mcp server needs to perform mesh processing operations including:
- Mesh inspection (boundary detection, validation)
- Mesh repair (healing invalid topology)
- Mesh transformation (scaling, rotation, translation)
- Mesh splitting (partitioning into components)
- Boolean operations (union, difference, intersection)
- Connector generation (manufacturing-specific)

The project must support these operations within a single Node.js-based MCP server. The primary options were:

1. **Python + trimesh** (and FreeCAD/Blender for advanced operations)
   - Gold standard in the CAD/3D printing community
   - Mature, battle-tested for manufacturing workflows
   - Rich feature set for mesh analysis and repair
   - Requires: Python subprocess, IPC overhead, dual runtime environment

2. **Node.js + manifold-3d WASM**
   - WASM port of the C++ Manifold library
   - Runs in-process within the Node.js server
   - Single language/runtime (TypeScript/JavaScript)
   - Bundleable to a single binary
   - Limited but sufficient feature set for Phases 1-3
   - Smaller ecosystem compared to Python

3. **Hybrid approach**: Node.js for Phases 1-3, defer Python/CAD engines to Phase 4

## Decision
Use **Node.js with manifold-3d WASM** for Phases 1-3. Defer Python-based tools (trimesh, FreeCAD, Blender) to Phase 4 for advanced CAD operations.

## Reasoning

**Single Runtime Environment**
- Eliminates subprocess spawning and inter-process communication overhead
- Reduces latency for geometry operations (no serialization/deserialization of 3D data)
- Simplified deployment: single Node.js process, no Python dependency
- Easier testing and debugging within the same language

**Bundleable to Single Binary**
- manifold-3d WASM is bundleable with bun build --compile
- Users can drop in a single executable without installing Node.js/Python
- Aligns with ADR 003 (Bun Compilation)
- No complex dependency chains or subprocess management

**Sufficient for Manufacturing Use Cases (Phases 1-3)**
- manifold-3d handles the core operations:
  - Robust boolean operations (union, difference, intersection)
  - Mesh repair via automatic healing algorithms
  - Mesh validation and boundary detection
  - Exact arithmetic geometry (avoids floating-point artifacts)
- Works well for 3D printing and additive manufacturing workflows
- Handles CAD-to-STL conversion and geometry cleanup

**Practical Phase-Based Roadmap**
- **Phase 1-3**: Node.js + manifold-3d (core geometry tools)
- **Phase 4**: Python subprocess bridge for specialized operations
  - FreeCAD integration for parametric design
  - Blender integration for advanced modeling
  - trimesh for specialized mesh analysis
- Allows incremental complexity without blocking initial implementation

**Developer Experience**
- Single language stack simplifies onboarding
- No Python environment setup required initially
- TypeScript/JavaScript familiarity for web developers
- Easier continuous integration (fewer language runtimes)

## Consequences

### Positive
- Fast, in-process geometry operations
- Single Node.js runtime simplifies deployment and testing
- WASM bundling enables zero-dependency distribution
- Type safety via TypeScript throughout the server
- Lower latency for geometry operations
- Single-binary executable distribution possible

### Negative
- Smaller and less mature JavaScript/WASM mesh ecosystem compared to Python
- Less community precedent for manufacturing-grade mesh operations in JavaScript
- Some advanced operations (e.g., highly specialized CAD algorithms) may require Phase 4 Python bridge
- Debugging WASM code is more complex than pure JavaScript

### Implementation Details

**manifold-3d Integration**
- Install: `npm install manifold-3d`
- Expose geometry tools as MCP tool definitions
- Implement wrappers around manifold-3d API
- Use TypeScript for type safety and IDE support

**WASM Bundling Consideration**
- Test WASM bundling with bun build --compile during development
- Verify manifold-3d WASM loads correctly in compiled binary
- If bundling issues arise, fall back to Node.js binary distribution

**Phase 4 Python Bridge** (future)
- Use Node.js child_process to spawn Python for FreeCAD/Blender
- Serialize/deserialize geometry via standard formats (STEP, IGES, STL)
- Make Python subprocess optional and conditional on tool requests

## Tradeoffs

| Criterion | manifold-3d (Node.js) | trimesh (Python) |
|-----------|----------------------|------------------|
| **Runtime** | In-process, fast | Subprocess, IPC overhead |
| **Deployment** | Single binary possible | Requires Python + dependencies |
| **Features** | Booleans, repair, transform | Comprehensive mesh analysis |
| **Community** | Emerging | Mature, gold standard |
| **Learning curve** | Lower (JS/TS) | Higher (Python + CAD knowledge) |

## Related Decisions
- ADR 001: pnpm Monorepo (manages manifold-3d dependency)
- ADR 003: Bun Compilation (bundles manifold-3d WASM)
- ADR 004: MCP Server Architecture (cad-geometry-mcp uses manifold-3d)
