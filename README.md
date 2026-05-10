# bambu-cli-mcp

AI-native 3D printing pipelines via [MCP](https://modelcontextprotocol.io). Turn natural language into print-ready manufacturing packages.

Two MCP servers expose 22 tools that chain mesh geometry operations and BambuStudio CLI orchestration into declarative manufacturing workflows — from STL to sliced, split, connector-equipped 3MF projects.

**[Documentation](https://catesandrew.github.io/bambu-cli-mcp)** | **[Architecture Decisions](docs/adr/)** | **[Examples](examples/)**

## What it does

```
"Scale this ramp to 400% and split it for my Bambu X1E"
                        |
                        v
              inspect_mesh (watertight check, dimensions)
                        |
              repair_mesh (fix normals, merge vertices)
                        |
              scale_mesh (uniform 4x)
                        |
              split_mesh (recursive until all parts fit 256mm)
                        |
              add_dowel_connectors (surface-validated, 12mm dowels)
                        |
              BambuStudio CLI (orient, arrange, export 3MF per part)
                        |
                        v
        36 print-ready 3MF files + assembly manifest
```

## Quick Start

### Prerequisites

- [BambuStudio](https://bambulab.com/en/download/studio) installed
- Node.js >= 20
- pnpm

### Install

```bash
git clone https://github.com/catesandrew/bambu-cli-mcp.git
cd bambu-cli-mcp
pnpm install
pnpm build
```

### Configure your MCP client

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "bambu-cli-mcp": {
      "command": "node",
      "args": ["/path/to/bambu-cli-mcp/dist/index.js", "--server", "both"]
    }
  }
}
```

**Claude Code** (`.claude/settings.json`):

```json
{
  "mcpServers": {
    "bambu-cli-mcp": {
      "command": "node",
      "args": ["/path/to/bambu-cli-mcp/dist/index.js", "--server", "both"]
    }
  }
}
```

The `--server` flag selects which tools to load:

| Flag | Tools | Use case |
|------|-------|----------|
| `bambu` | 11 BambuStudio tools | Slicing and export only |
| `geometry` | 11 geometry tools | Mesh processing only |
| `both` | All 22 tools | Full pipeline |

## Tools

### BambuStudio Tools (11)

| Tool | Description |
|------|-------------|
| `inspect_bambu_cli` | Returns BambuStudio version, path, and available CLI flags |
| `convert_to_3mf` | Convert STL/OBJ files into a .3mf project |
| `arrange_project` | Auto-arrange objects on the build plate |
| `orient_project` | Auto-orient objects for optimal printing |
| `slice_project` | Slice a project with specified settings |
| `export_plate_png` | Export PNG preview images of plates |
| `export_stls` | Export objects as individual STL files |
| `export_settings` | Export BambuStudio settings to JSON |
| `validate_project` | Validate a project and report info/warnings |
| `estimate_print` | Estimate print time and filament usage |
| `create_print_package` | Full pipeline: convert, arrange, orient, slice, preview |

### Geometry Tools (11)

**Core:**

| Tool | Description |
|------|-------------|
| `inspect_mesh` | Bounds, triangle count, volume, watertight status, genus |
| `repair_mesh` | Fix normals, merge vertices, remove degenerate faces |
| `scale_mesh` | Uniform scaling by any factor |
| `split_mesh` | Recursive splitting until all parts fit build volume |
| `lay_flat` | Orient largest flat face onto build plate |
| `add_dowel_connectors` | Surface-validated dowel connectors on split seams |
| `generate_assembly_manifest` | Parts, neighbors, connectors, hardware list |

**Workflows:**

| Tool | Description |
|------|-------------|
| `make_printable_large_model` | inspect -> scale -> repair -> split -> connectors -> manifest |
| `repair_and_prepare` | inspect -> repair -> lay flat |
| `split_with_connectors` | split -> connectors -> manifest |
| `list_available_engines` | Detect available CAD engines |

## Examples

### Inspect a mesh

```json
{
  "tool": "inspect_mesh",
  "arguments": { "path": "/models/ramp.stl" }
}
```

Returns:
```json
{
  "bounds": { "min": [-5, -5, 0], "max": [5, 5, 10], "size": [10, 10, 10] },
  "triangleCount": 12,
  "volume": 1000,
  "watertight": true,
  "genus": 0
}
```

### Scale and split for printing

```json
{
  "tool": "make_printable_large_model",
  "arguments": {
    "input": "/models/ramp.stl",
    "scale": 4,
    "buildVolume": [256, 256, 256],
    "connector": {
      "type": "dowel",
      "diameterMm": 12,
      "depthMm": 25,
      "clearanceMm": 0.2,
      "countPerSeam": 4
    },
    "outputDir": "outputs/"
  }
}
```

### Slice a 3MF project

```json
{
  "tool": "slice_project",
  "arguments": {
    "project": "/path/to/model.3mf",
    "plate": 0,
    "settings": {
      "machine": "profiles/printers/bambu_x1e.json",
      "process": "profiles/process/petg_strong_030.json",
      "filaments": ["profiles/filament/petg.json"]
    }
  }
}
```

See [`examples/`](examples/) for more workflow examples.

## Architecture

```
LLM Client (Claude, ChatGPT, etc.)
        |
        | MCP (stdio)
        |
   bambu-cli-mcp              cad-geometry-mcp
   ├─ BambuStudio CLI         ├─ manifold-3d (WASM)
   │  adapter (execa)         ├─ Binary STL I/O
   ├─ 11 tools                ├─ 7 core + 4 workflow tools
   ├─ Zod schemas             ├─ Connector engine
   └─ Workspace manager       └─ CAD engine detection
        |                          |
        v                          v
   BambuStudio CLI            In-process WASM
   (orient, slice,            (no Python, no subprocess)
    export 3MF)
```

**Key design decisions:**

- **pnpm** monorepo with two logical servers in one repo
- **manifold-3d WASM** for geometry — single language, no Python dependency
- **Recursive splitting** — halves oversized parts until all fit build volume
- **Surface-validated connectors** — sphere intersection probes filter positions in empty space
- **One 3MF per part** — BambuStudio CLI stacks objects; individual exports avoid this

See [Architecture Decision Records](docs/adr/) for full rationale.

## Development

```bash
pnpm test          # 29 tests across 7 files
pnpm build         # TypeScript compilation
pnpm run lint      # Type checking (tsc --noEmit)
pnpm run dev       # Watch mode
```

### Project structure

```
src/
  index.ts                          # Entry point (--server flag)
  bambu-cli-mcp/                    # BambuStudio CLI wrapper
    server.ts, tools/, adapters/, schemas/
  cad-geometry-mcp/                 # Geometry engine
    server.ts, tools/, engines/, schemas/
  shared/                           # Workspace, errors, types
test/                               # 7 test files, 29 tests
docs/adr/                           # 6 architecture decision records
examples/                           # Workflow JSON examples
profiles/                           # Printer/process/filament configs
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BAMBU_STUDIO_PATH` | Path to BambuStudio binary | Auto-detected |

## Tested with

- BambuStudio v02.06.01.55
- Node.js v22+ / v24
- macOS (ARM64)
- Bambu Lab X1E, P2S printers

## License

MIT
