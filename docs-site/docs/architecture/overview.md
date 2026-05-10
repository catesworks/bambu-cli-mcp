---
sidebar_position: 1
---

# Architecture Overview

## Two-Server Design

bambu-cli-mcp is structured as two MCP servers in a single pnpm monorepo:

| Server | Package | Responsibility |
|---|---|---|
| `bambu-cli-mcp` | `packages/bambu-cli-mcp` | Wraps BambuStudio CLI via execa |
| `cad-geometry-mcp` | `packages/cad-geometry-mcp` | Mesh geometry via manifold-3d WASM |

Both servers expose their tools over `stdio` MCP transport and can be started together or independently via the `--server` flag.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                   LLM Client                        │
│              (Claude Desktop / API)                 │
└──────────────────────┬──────────────────────────────┘
                       │ MCP (stdio)
                       ▼
┌─────────────────────────────────────────────────────┐
│              MCP Server Process                     │
│                                                     │
│  ┌─────────────────────┐  ┌──────────────────────┐  │
│  │   bambu-cli-mcp     │  │   cad-geometry-mcp   │  │
│  │                     │  │                      │  │
│  │  11 slicer tools    │  │  11 geometry tools   │  │
│  │                     │  │                      │  │
│  │  execa              │  │  manifold-3d WASM    │  │
│  │     │               │  │  (in-process)        │  │
│  │     ▼               │  └──────────────────────┘  │
│  │  BambuStudio CLI    │                             │
│  │  (subprocess)       │                             │
│  └─────────────────────┘                             │
└─────────────────────────────────────────────────────┘
```

The geometry server runs manifold-3d as WASM in the same Node.js process — no subprocess, no IPC overhead. The BambuStudio server spawns BambuStudio as an external process since the CLI is a compiled C++ binary.

## Key Design Decisions

### pnpm monorepo

All packages share a single `pnpm-lock.yaml` and use workspace protocol (`workspace:*`) for internal dependencies. This keeps the geometry engine and slicer tooling versioned together. See [ADR-001](./adr#adr-001-pnpm-monorepo).

### Node.js geometry worker

Rather than calling Python (trimesh, numpy-stl) or spawning OpenSCAD/FreeCAD subprocesses, the geometry server loads manifold-3d WASM directly into Node.js. This eliminates the Python runtime dependency and subprocess latency. See [ADR-002](./adr#adr-002-nodejs-geometry-worker-over-python).

### Bun compilation target

TypeScript sources compile to a single bundled file per package using Bun's bundler. This produces fast cold-start times and a self-contained `dist/index.js` with no `node_modules` resolution at runtime. See [ADR-003](./adr#adr-003-bun-compilation-target).

### Zod schemas for all tool inputs

Every MCP tool's input is defined with a Zod schema. This provides:
- Runtime validation with clear error messages surfaced to the LLM
- TypeScript types inferred from schemas (single source of truth)
- JSON Schema generation for MCP tool definitions

### Workspace isolation

Each tool call operates on files in a designated working directory. No shared mutable state between tool calls. This makes the servers safe for concurrent MCP client requests.

## Repository Structure

```
bambu-cli-mcp/
├── packages/
│   ├── bambu-cli-mcp/        # BambuStudio CLI wrapper
│   └── cad-geometry-mcp/     # manifold-3d geometry server
├── docs-site/                # This Docusaurus site
├── docs/                     # ADR documents
├── print-large-model.skill   # OMC skill for large model workflow
└── pnpm-workspace.yaml
```

## ADR Documents

Architecture decisions are recorded in `docs/adr/`. See the [ADR index](./adr) for summaries and links.
