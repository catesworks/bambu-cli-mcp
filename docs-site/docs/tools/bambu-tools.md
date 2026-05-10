---
sidebar_position: 1
---

# BambuStudio Tools

The `bambu-cli-mcp` server exposes 11 tools that wrap the BambuStudio CLI. Each tool runs BambuStudio as a subprocess via `execa` and returns structured output.

## CLI Path Detection

The server searches these locations in order:

1. `BAMBU_STUDIO_PATH` environment variable (full path to the binary)
2. `/Applications/BambuStudio.app/Contents/MacOS/BambuStudio` (macOS)
3. `C:\Program Files\Bambu Studio\BambuStudio.exe` (Windows)
4. `bambu-studio` on `PATH` (Linux)

Set `BAMBU_STUDIO_PATH` to override auto-detection:

```bash
export BAMBU_STUDIO_PATH="/custom/path/to/BambuStudio"
```

## Tool Reference

| Tool | Description |
|---|---|
| `slice_model` | Slice an STL/3MF with a given printer profile, producing G-code |
| `arrange_models` | Auto-arrange multiple models on the build plate |
| `orient_model` | Auto-orient a model for optimal printability |
| `export_3mf` | Export a project to a 3MF archive |
| `import_3mf` | Import a 3MF file and inspect its contents |
| `set_print_settings` | Apply print settings (layer height, infill, supports) to a project |
| `get_print_settings` | Read current print settings from a project |
| `list_profiles` | List available printer and filament profiles |
| `validate_model` | Check a model for sliceability issues |
| `get_slice_preview` | Generate a slice preview image |
| `repair_model` | Run BambuStudio's built-in mesh repair |

## Examples

### slice_model

```json
{
  "name": "slice_model",
  "arguments": {
    "input": "/models/part_a.stl",
    "output": "/output/part_a.gcode",
    "profile": "Bambu Lab P1S 0.4 nozzle",
    "filament": "Bambu PLA Basic @BBL P1S"
  }
}
```

### arrange_models

```json
{
  "name": "arrange_models",
  "arguments": {
    "inputs": [
      "/models/part_a.stl",
      "/models/part_b.stl"
    ],
    "output": "/output/arranged.3mf",
    "printer": "Bambu Lab P1S"
  }
}
```

### orient_model

```json
{
  "name": "orient_model",
  "arguments": {
    "input": "/models/ramp.stl",
    "output": "/output/ramp_oriented.stl"
  }
}
```

### export_3mf

```json
{
  "name": "export_3mf",
  "arguments": {
    "input": "/projects/ramp.bbproject",
    "output": "/output/ramp.3mf"
  }
}
```

### set_print_settings

```json
{
  "name": "set_print_settings",
  "arguments": {
    "project": "/projects/ramp.bbproject",
    "layer_height": 0.2,
    "infill_density": 40,
    "supports": true,
    "support_type": "tree"
  }
}
```

### list_profiles

```json
{
  "name": "list_profiles",
  "arguments": {
    "type": "printer"
  }
}
```

Returns an array of profile name strings available in the local BambuStudio installation.

### validate_model

```json
{
  "name": "validate_model",
  "arguments": {
    "input": "/models/part_a.stl"
  }
}
```

Returns `{ "valid": true }` or `{ "valid": false, "issues": ["non-manifold edges at ..."] }`.

### repair_model

```json
{
  "name": "repair_model",
  "arguments": {
    "input": "/models/broken.stl",
    "output": "/models/repaired.stl"
  }
}
```

Uses BambuStudio's built-in repair. For more advanced repair, use the geometry server's `repair_mesh` tool which uses manifold-3d.
