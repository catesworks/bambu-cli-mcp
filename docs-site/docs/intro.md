---
sidebar_position: 1
---

# Getting Started

bambu-cli-mcp is a monorepo containing two MCP (Model Context Protocol) servers that expose 3D printing and mesh geometry capabilities to AI assistants like Claude:

- **bambu-cli-mcp** — wraps the BambuStudio CLI to slice, arrange, orient, and export models
- **cad-geometry-mcp** — runs mesh geometry operations (inspect, repair, split, connectors) via manifold-3d WASM

Together they enable end-to-end AI-native 3D printing pipelines: an LLM can take an oversized STL, split it into printable parts, add connector dowels, slice each part, and export print-ready 3MF files — all through tool calls.

## Prerequisites

| Requirement | Version |
|---|---|
| [BambuStudio](https://github.com/bambulab/BambuStudio) | Latest (CLI required) |
| Node.js | >= 20 |
| pnpm | >= 8 |

BambuStudio must be installed so the CLI binary is available. The server auto-detects common install paths; see [BambuStudio Tools](./tools/bambu-tools) for the `BAMBU_STUDIO_PATH` override.

## Installation

```bash
git clone https://github.com/catesworks/bambu-cli-mcp.git
cd bambu-cli-mcp
pnpm install
pnpm build
```

## MCP Client Configuration

Add to your MCP client config (e.g. Claude Desktop `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "bambu-cli-mcp": {
      "command": "node",
      "args": [
        "/path/to/bambu-cli-mcp/dist/index.js",
        "--server", "both"
      ]
    }
  }
}
```

### The `--server` flag

| Value | What starts |
|---|---|
| `bambu` | BambuStudio CLI tools only |
| `geometry` | Mesh geometry tools only |
| `both` | Both servers (default) |

Use `--server both` for full pipeline capability. Use individual values if you only need one set of tools or want to run the servers as separate processes.

## What's Next

- [BambuStudio Tools](./tools/bambu-tools) — all 11 slicer tools with examples
- [Geometry Tools](./tools/geometry-tools) — mesh inspect, repair, split, connectors
- [Printing Large Models](./guides/large-model-printing) — end-to-end RC ramp walkthrough
- [Architecture Overview](./architecture/overview) — design decisions and server diagram
