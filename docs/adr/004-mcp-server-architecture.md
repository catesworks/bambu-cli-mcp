# ADR 004: Two-Server Architecture with Unified Codebase and Runtime Selection

## Status
Accepted

## Context
The project needs to expose two logically distinct sets of MCP tools:

1. **Bambu Studio Integration** (bambu-cli-mcp)
   - Wraps BambuStudio CLI operations (slicing, export, device control)
   - Approximately 11 tools
   - Requires: BambuStudio installation on host system
   - Operations: Export models, slice files, queue prints, query device status, etc.

2. **CAD Geometry Operations** (cad-geometry-mcp)
   - Mesh processing using manifold-3d (ADR 002)
   - Approximately 6+ tools
   - Requires: No external dependencies (WASM in-process)
   - Operations: Inspect, repair, transform, split, boolean operations, etc.

The primary architectural options are:

1. **Single monolithic server**: One MCP server with all tools
   - Simpler deployment model
   - Tight coupling of unrelated concerns
   - Users who only need geometry tools must run BambuStudio integration code
   - Makes binaries larger and dependency-heavier

2. **Separate repositories**: Two independent projects
   - Clean separation of concerns
   - Independent versioning and release cycles
   - Duplicate build infrastructure and configuration
   - Users must manage two separate packages

3. **Monorepo with selectable servers**: Two logical servers in one repository
   - Single shared build infrastructure
   - Clean tool separation via `--server` flag
   - Independent deployability (users can select which to deploy)
   - Shared configuration, error handling, and types
   - Recommended approach for this project

## Decision
Implement a **monorepo with two logical MCP servers** selectable via `--server` flag.

**Architecture**:
```
bambu-cli-mcp/
├── packages/
│   ├── bambu-cli-mcp/          # Server 1: BambuStudio CLI wrapper
│   │   ├── src/
│   │   │   ├── index.ts        # Server entry point
│   │   │   ├── tools/          # Tool definitions (11 tools)
│   │   │   └── ...
│   │   └── package.json
│   │
│   └── cad-geometry-mcp/       # Server 2: Geometry operations
│       ├── src/
│       │   ├── index.ts        # Server entry point
│       │   ├── tools/          # Tool definitions (6+ tools)
│       │   └── ...
│       └── package.json
│
├── packages/
│   └── shared/                 # Shared code (types, error handling, utils)
│       ├── src/
│       │   ├── types.ts
│       │   ├── errors.ts
│       │   └── ...
│       └── package.json
│
├── pnpm-workspace.yaml         # Monorepo configuration (ADR 001)
└── ...
```

## Reasoning

**Single Repository, Clean Separation**
- Both servers coexist in a pnpm monorepo (ADR 001)
- Each server has its own package.json, src/, and build output
- Shared code (types, utilities, error handling) in a common package
- Reduces duplication while maintaining logical separation

**Selectable Deployment**
- Runtime flag `--server bambu|geometry|both` determines which server(s) start
- Users needing only geometry tools can deploy the smaller cad-geometry-mcp
- Users needing both can deploy a combined server
- Reduces deployment footprint for single-purpose use cases

**Independent Compilability**
- Each server compiles to its own binary (via `bun build --compile`, ADR 003)
- `bambu-cli-mcp` executable contains only BambuStudio tools
- `cad-geometry-mcp` executable contains only geometry tools
- Binary size is minimized (users only download what they need)

**Shared Infrastructure**
- Type definitions: Shared TypeScript interfaces for tool definitions
- Error handling: Unified error response format across both servers
- Configuration: Consistent logging, environment variable handling
- Testing: Shared test utilities and fixtures
- Build pipeline: Single pnpm build for all packages

**Scalability to Phase 4**
- Adding CAD engine support (FreeCAD, Blender) can be a third server
- Same architecture pattern supports future specialization
- Monorepo scales well as more tools are added

**Independent Tool Development**
- Developers can focus on bambu-cli-mcp or cad-geometry-mcp independently
- Tool changes in one server don't require rebuilding the other
- Clear code ownership and responsibility boundaries

## Consequences

### Positive
- Simplified onboarding: Download one package, select which tools to use
- Independent binary sizes: Users don't bloat downloads with unneeded tools
- Shared configuration and type safety
- Easy to add more servers as needed (Phase 4 CAD engines)
- Single build system for all servers
- Easier testing and debugging with tool isolation

### Negative
- Slightly more complex initial setup (multiple package.json files)
- Monorepo tooling requires pnpm or equivalent
- Developers must understand two server codebases
- Shared code must be carefully managed (circular dependency risk)

### Implementation Details

**Server Selection at Runtime**
```bash
# Start only BambuStudio server
./bambu-cli-mcp --server bambu

# Start only geometry server
./cad-geometry-mcp --server geometry

# Start both servers (if combined binary)
./mcp-server --server both

# Default if no flag
./mcp-server  # Starts all available servers
```

**Tool Registration**
Each server defines its tools via MCP SDK:
```typescript
// packages/bambu-cli-mcp/src/tools/index.ts
export const BAMBU_TOOLS = [
  { name: "export_model", description: "...", handler: ... },
  { name: "slice_file", description: "...", handler: ... },
  // ... 11 tools
];

// packages/cad-geometry-mcp/src/tools/index.ts
export const GEOMETRY_TOOLS = [
  { name: "inspect_mesh", description: "...", handler: ... },
  { name: "repair_mesh", description: "...", handler: ... },
  // ... 6+ tools
];
```

**Shared Code Package**
- `packages/shared/src/types.ts`: Unified types and interfaces
- `packages/shared/src/errors.ts`: Error hierarchy and handling
- `packages/shared/src/utils.ts`: Common utilities (logging, validation, etc.)
- Exported as internal npm package: `@bambu-cli-mcp/shared`

**Build Process**
```bash
# Build all packages (runs in dependency order)
pnpm build

# Build individual servers
pnpm --filter bambu-cli-mcp build
pnpm --filter cad-geometry-mcp build

# Compile to binaries (ADR 003)
bun build --compile ./packages/bambu-cli-mcp/dist/index.js
bun build --compile ./packages/cad-geometry-mcp/dist/index.js
```

**Testing**
- `pnpm test`: Run all server tests
- `pnpm --filter bambu-cli-mcp test`: Test BambuStudio server only
- Shared test utilities in `packages/shared/src/__tests__/`

### Tool Count and Scope

**Server 1: bambu-cli-mcp** (11 tools)
- Query device status
- List connected devices
- Export model to device
- Get print status
- Cancel print job
- Pause print job
- Resume print job
- Get device settings
- Set device settings
- Slice model (invoke BambuStudio slicer)
- Query available filament profiles

**Server 2: cad-geometry-mcp** (6+ tools, expandable)
- Inspect mesh (vertices, faces, topology)
- Validate mesh (check for errors)
- Repair mesh (fix invalid topology)
- Scale mesh (uniform or per-axis)
- Translate/rotate mesh (transformations)
- Split mesh (partition into components)
- Boolean operations: union, difference, intersection
- Generate connectors (manufacturing-specific, Phase 2)
- Estimate volume/weight (Phase 2)

## Tradeoffs

| Criterion | Monorepo (This ADR) | Single Repo | Separate Repos |
|-----------|-------------------|------------|-----------------|
| **Setup** | One clone, multiple servers | One clone, all tools | Multiple clones |
| **Shared code** | Easy, internal package | Tangled | Duplicated or external |
| **Build complexity** | Medium (pnpm workspaces) | Low | Low |
| **Independent release** | Possible | Hard | Easy |
| **Deployment flexibility** | High (choose servers) | Low (all or nothing) | High (choose repos) |
| **Onboarding** | One package, select tools | One package, all tools | Learn multiple projects |

## Related Decisions
- ADR 001: pnpm Monorepo (enables this architecture)
- ADR 002: Node.js + manifold-3d (used by cad-geometry-mcp)
- ADR 003: bun build --compile (both servers compile to binaries)

## Future Considerations

**Phase 4 Expansion**
- Add `cad-engine-mcp` for FreeCAD/Blender integration
- Reuse same monorepo pattern
- Share type definitions and error handling
- Users can deploy only FreeCAD tools if they don't need other servers

**Multi-Server Coordination**
- If Phase 4 adds a coordinating server (e.g., orchestrating multiple backends)
- Monorepo simplifies inter-server communication and testing
- Shared configuration becomes increasingly valuable

**Dependency Management**
- bambu-cli-mcp depends on: execa, zod, @modelcontextprotocol/sdk
- cad-geometry-mcp depends on: manifold-3d, zod, @modelcontextprotocol/sdk
- shared depends on: zod (only direct dependency)
- Minimize cross-server dependencies to maintain independence
