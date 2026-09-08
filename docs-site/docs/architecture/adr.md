---
sidebar_position: 2
---

# Architecture Decision Records

This page indexes the architecture decisions for bambu-cli-mcp. Each ADR records the context, decision, and consequences for a key design choice. The full documents live in [`docs/adr/`](https://github.com/catesworks/bambu-cli-mcp/tree/main/docs/adr) in the repository.

## ADR-001: pnpm Monorepo

**Decision**: Use pnpm workspaces to manage the multi-package repository.

The two MCP servers (`bambu-cli-mcp` and `cad-geometry-mcp`) share tooling, TypeScript config, and build scripts. A pnpm monorepo with `workspace:*` protocol keeps them versioned together without publishing to npm. Hoisted dependencies reduce total `node_modules` size.

[View ADR-001](https://github.com/catesworks/bambu-cli-mcp/tree/main/docs/adr/001-pnpm-monorepo.md)

---

## ADR-002: Node.js Geometry Worker over Python

**Decision**: Implement mesh geometry operations in Node.js using manifold-3d WASM instead of a Python geometry library.

Python-based solutions (trimesh, Open3D, FreeCAD scripting) require a Python runtime, add subprocess overhead, and introduce a second language to maintain. manifold-3d compiles to WASM and loads directly into the Node.js MCP server process, eliminating the Python dependency and IPC latency while providing stronger manifold guarantees than trimesh's pure-Python repair.

[View ADR-002](https://github.com/catesworks/bambu-cli-mcp/tree/main/docs/adr/002-nodejs-geometry-worker.md)

---

## ADR-003: Bun Compilation Target

**Decision**: Use Bun's bundler to compile TypeScript to a single `dist/index.js` per package.

Bun's bundler produces a self-contained bundle with all dependencies inlined, enabling fast cold starts and simple deployment (copy `dist/index.js`, run with Node.js). This is particularly important for MCP servers which are spawned on demand by the client.

[View ADR-003](https://github.com/catesworks/bambu-cli-mcp/tree/main/docs/adr/003-bun-compilation-target.md)

---

## ADR-004: MCP Server Architecture (Two Servers, One Repo)

**Decision**: Expose two separate MCP servers (bambu-cli-mcp and cad-geometry-mcp) from a single repository, launchable together or independently.

A single monolithic MCP server would couple the BambuStudio CLI dependency to the geometry engine. Separating them allows users who only need geometry operations to run without BambuStudio installed, and vice versa. The `--server` flag keeps configuration simple for users who want both.

[View ADR-004](https://github.com/catesworks/bambu-cli-mcp/tree/main/docs/adr/004-mcp-server-architecture.md)

---

## ADR-005: manifold-3d WASM Usage Patterns

**Decision**: Load manifold-3d WASM once at server startup and reuse the module instance across tool calls.

WASM module instantiation has non-trivial startup cost (~200–400 ms). Loading once and caching the instance reduces per-call latency to near-zero for the WASM init phase. The manifold-3d API is stateless per operation (meshes are value types), so reuse is safe.

[View ADR-005](https://github.com/catesworks/bambu-cli-mcp/tree/main/docs/adr/005-manifold-wasm-patterns.md)

---

## ADR-006: Workflow Orchestration Tools

**Decision**: Include higher-level workflow tools (`split_mesh` + `add_dowel_connectors` + `export_parts_as_3mf`) alongside primitive geometry tools.

Primitive tools (translate, rotate, boolean) require many LLM round-trips to accomplish common tasks. Workflow tools encode domain knowledge (seam detection, connector placement, multi-part packaging) that would otherwise require the LLM to reason through geometry details. Both layers are exposed so simple tasks use primitives and complex pipelines use workflows.

[View ADR-006](https://github.com/catesworks/bambu-cli-mcp/tree/main/docs/adr/006-workflow-orchestration-tools.md)
