# bambu-cli-mcp

MCP server that wraps BambuStudio CLI for 3D printing project orchestration. Exposes slicing, orientation, arrangement, export, and project management as LLM-callable tools.

## Prerequisites

- [BambuStudio](https://bambulab.com/en/download/studio) installed (tested with v02.06.01.55)
- Node.js >= 20
- pnpm

## Quick Start

```bash
pnpm install
pnpm build
```

## Usage

### With Claude Desktop / Claude Code

Add to your MCP client config:

```json
{
  "mcpServers": {
    "bambu-cli-mcp": {
      "command": "node",
      "args": ["/path/to/bambu-cli-mcp/dist/index.js", "--server", "bambu"]
    },
    "cad-geometry-mcp": {
      "command": "node",
      "args": ["/path/to/bambu-cli-mcp/dist/index.js", "--server", "geometry"]
    }
  }
}
```

The `--server` flag selects which tools to load:
- `--server bambu` — BambuStudio tools only (default if flag omitted)
- `--server geometry` — Geometry tools only
- `--server both` — Both tool sets (if running combined binary)

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BAMBU_STUDIO_PATH` | Path to BambuStudio binary | Auto-detected |

## Tools

### BambuStudio Tools

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

### Geometry Tools

**Core Tools**

| Tool | Description |
|------|-------------|
| `inspect_mesh` | Analyze mesh: vertices, faces, bounds, topology, genus, watertightness |
| `repair_mesh` | Fix invalid topology, remove degeneracies, validate manifold property |
| `scale_mesh` | Scale mesh uniformly or per-axis (X, Y, Z) |
| `split_mesh` | Split mesh by plane for grid-based partitioning |
| `lay_flat` | Rotate mesh so largest face is parallel to XY plane |
| `generate_assembly_manifest` | Combine split mesh parts with connector geometry |
| `add_dowel_connectors` | Add dowel connectors (male protrusions + female holes) to split parts along seams |

**Workflow Tools**

| Tool | Description |
|------|-------------|
| `make_printable_large_model` | Full pipeline: inspect → scale → repair → split → connectors → manifest |
| `repair_and_prepare` | Pipeline: inspect → repair → lay flat for print-ready orientation |
| `split_with_connectors` | Pipeline: split → add connectors → manifest for assembly |
| `list_available_engines` | Detect available CAD engines (manifold, FreeCAD, Blender, Fusion) |

## Example

```json
{
  "name": "slice_project",
  "arguments": {
    "project": "/path/to/model.3mf",
    "plate": 0,
    "settings": {
      "machine": "/path/to/machine.json",
      "process": "/path/to/process.json",
      "filaments": ["/path/to/filament.json"]
    }
  }
}
```

## Development

```bash
pnpm test          # Run tests
pnpm build         # Compile TypeScript
pnpm run lint      # Type check
```

## Architecture

See [docs/adr/](docs/adr/) for architecture decision records.

```
bambu-cli-mcp
  ├── BambuStudio CLI adapter (execa)
  ├── 11 MCP tools
  ├── Workspace manager (temp dirs)
  └── Zod schema validation

cad-geometry-mcp (Phase 2+)
  ├── manifold-3d WASM engine
  ├── STL I/O and mesh processing
  ├── 7 core geometry tools (inspect, repair, scale, split, lay_flat, manifest, connectors)
  ├── 4 workflow tools (orchestrate multi-step pipelines)
  └── Engine detection (runtime CAD engine discovery)
```

## License

MIT
