# ADR 005: manifold-3d WASM Usage Patterns

## Status
Accepted

## Context
The cad-geometry-mcp server requires mesh processing capabilities for Phase 1-3 operations:
- Inspect mesh topology, vertices, and faces
- Repair invalid or corrupted meshes
- Scale meshes uniformly or per-axis
- Split meshes by plane for grid-based splitting
- Generate boolean connectors (union, difference operations)

The project evaluated two approaches:
1. **Python dependency** (FreeCAD, CadQuery, OpenFOAM mesh tools): Adds heavyweight external dependency, requires system Python installation
2. **manifold-3d WASM**: In-process WASM library, no external dependencies, pure JavaScript interface

manifold-3d is a WASM port of the C++ Manifold library, a high-performance 3D geometry kernel. Version 3.4.1 was selected as the stable baseline.

## Decision
Use **manifold-3d v3.4.1** as the mesh processing engine for cad-geometry-mcp with the following patterns:

### WASM Initialization

After WASM module loads, call `mod.setup()` to attach static factory methods to the Manifold class:
```javascript
const Manifold = await import('manifold-3d');
const mod = await Manifold.default();

// REQUIRED: Attach static methods (cube, cylinder, sphere, ofMesh, etc.)
mod.setup();

// Now available:
const cube = new mod.Manifold.cube(10);
const sphere = new mod.Manifold.sphere(5);
const mesh = new mod.Manifold.ofMesh(meshData);
```

The `Mesh` class is only available after `setup()` returns.

### STL I/O (Custom Implementation)

manifold-3d does not include built-in STL serialization. Implement custom binary STL parser and writer:

**Parse STL to Manifold**:
```javascript
// 1. Parse binary STL file
const stlBuffer = fs.readFileSync('model.stl');
const mesh = parseBinarySTL(stlBuffer); // → {numProp: 3, vertProperties, triVerts}

// 2. Create Manifold
const manifold = new mod.Manifold(mesh);
```

**Export Manifold to STL**:
```javascript
// 1. Extract mesh data
const mesh = manifold.getMesh(); // → {numProp, vertProperties, triVerts}

// 2. Serialize to binary STL
const stlBuffer = serializeBinarySTL(mesh);
fs.writeFileSync('output.stl', stlBuffer);
```

### Mesh Creation from Raw Data

Create a Manifold from indexed vertex data:
```javascript
const meshData = {
  numProp: 3,                    // 3 properties per vertex (x, y, z)
  vertProperties: Float32Array,  // Flat array: [x0, y0, z0, x1, y1, z1, ...]
  triVerts: Uint32Array          // Triangle indices: [v0, v1, v2, v3, v4, v5, ...]
};

const manifold = new mod.Manifold(new mod.Mesh(meshData));
```

### Mesh Operations

**Split by plane** (for grid splitting):
```javascript
const [above, below] = manifold.splitByPlane(
  [0, 0, 1],  // normal vector
  5.0         // offset from origin
);
```

**Boolean operations** (for connectors):
```javascript
const union = manifold1.add(manifold2);           // Union
const difference = manifold1.subtract(manifold2); // Difference
const intersection = manifold1.intersect(manifold2); // Intersection
```

### Memory Management

manifold-3d uses WASM linear memory. Explicitly free manifolds when no longer needed:
```javascript
try {
  const result = manifold.getMesh();
  // ... process result
} finally {
  manifold.delete(); // Required to free WASM memory
}
```

Always wrap manifold operations in `try/finally` blocks to ensure cleanup.

### Mesh Validation

Check mesh quality after operations:
```javascript
const mesh = manifold.getMesh();

// Genus-0 + status=NoError indicates watertight manifold mesh
const isValid = manifold.genus() === 0 && manifold.status() === 'NoError';
```

### Singleton Module Initialization

The WASM module is initialized once and cached:
```javascript
let cachedModule = null;

async function getManifoldModule() {
  if (cachedModule) return cachedModule;

  const Manifold = await import('manifold-3d');
  const mod = await Manifold.default();
  mod.setup();

  cachedModule = mod;
  return mod;
}
```

Callers retrieve the module via `getManifoldModule()` rather than initializing repeatedly.

## Consequences

### Positive
- **No external dependencies**: Geometry processing works in-process without Python, FreeCAD, or system tools
- **Fast startup**: WASM module loads in milliseconds
- **Memory safe**: Explicit `delete()` calls prevent leaks; WASM sandbox contains all operations
- **Cross-platform**: WASM runs identically on Linux, macOS, Windows
- **Phase 1-3 complete**: Sufficient for inspect, repair, scale, split, and connector operations
- **Single responsibility**: manifold-3d handles only mesh processing; cad-geometry-mcp handles I/O and tool orchestration
- **Small binary**: WASM module is ~2MB, minimal overhead to download/deploy

### Negative
- **Manual memory management**: Must call `delete()` explicitly; missed calls cause WASM memory leaks
- **Custom STL I/O**: No built-in STL support; must implement binary parser and serializer
- **Limited debugging**: WASM errors may lack clear stack traces; requires careful testing
- **Vendor lock-in (WASM)**: If manifold-3d proves insufficient, switching to another library requires rewriting I/O and operation wrappers
- **No Python integration (Phase 4)**: If Phase 4 requires FreeCAD or Blender, manifold-3d cannot be used; will need parallel Python worker

### Implementation Requirements

1. **STL Parser/Serializer** (~200 LOC)
   - Binary STL format: 80-byte header + (4-byte count + 50-byte triangles per face)
   - Vertex property index caching to avoid duplicates

2. **Module Initialization** (~50 LOC)
   - Singleton pattern with lazy loading
   - Error handling for WASM initialization

3. **Memory Management Wrapper** (~100 LOC)
   - AutoDelete class using WeakMap to track manifold lifecycle
   - Automatic cleanup in tool handlers

4. **Validation Helpers** (~50 LOC)
   - Check genus, status, bounds
   - Detect non-manifold or inverted meshes

### Tool Implementations Enabled

**Phase 1**:
- `inspect_mesh`: Read vertices, faces, bounds, genus, status
- `repair_mesh`: Boolean union with self or filtered components

**Phase 2**:
- `scale_mesh`: Scale by factor or per-axis
- `split_mesh`: Split by plane for grid tiling
- `lay_flat`: Rotate mesh so largest face aligns with XY plane

**Phase 3**:
- `generate_assembly_manifest`: Combine split meshes with connector geometry

## Tradeoffs

| Criterion | manifold-3d WASM | Python (FreeCAD/CadQuery) | Separate CAD Engine |
|-----------|------------------|--------------------------|---------------------|
| **Dependencies** | None | Python 3.9+, FreeCAD or libs | External service |
| **Startup time** | <100ms | 2-5s (FreeCAD init) | 50-200ms (network) |
| **Memory safety** | Manual (delete) | Automatic GC | Isolated process |
| **Cross-platform** | WASM (all) | OS-specific builds | Network-dependent |
| **Debugging** | Hard (WASM stacks) | Good (Python traceback) | Good (remote debug) |
| **Binary size** | ~2MB | 50-200MB+ | ~1MB (client) |

## Related Decisions
- ADR 002: Node.js Geometry Worker (cad-geometry-mcp server infrastructure)
- ADR 004: MCP Server Architecture (cad-geometry-mcp is the second server)

## Future Considerations

**Phase 4 Expansion**: If advanced CAD features are needed (freeform surfaces, CSG with FreeCAD, parametric design), consider:
1. Keep manifold-3d for basic operations (inspect, scale, split, basic boolean)
2. Add optional `cad-engine-mcp` server for FreeCAD integration
3. Use monorepo pattern (ADR 004) to deploy both servers

**Module Alternatives**: If manifold-3d performance is insufficient:
- Evaluate `three-bvh-csg` for boolean operations
- Evaluate `opencascade.js` (experimental WASM port of OpenCASCADE)
- Maintain same STL I/O and memory management patterns for easy substitution
