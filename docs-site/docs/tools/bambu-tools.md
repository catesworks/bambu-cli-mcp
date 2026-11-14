---
sidebar_position: 1
---

# BambuStudio Tools

The `bambu-cli-mcp` server exposes 11 tools that wrap the BambuStudio CLI. Each tool runs BambuStudio as a subprocess via `execa` and returns structured output. All of them operate on local files: there is no live printer, print-queue or cloud control.

## CLI Path Detection

The server searches these locations in order:

1. `BAMBU_STUDIO_PATH` environment variable (full path to the binary)
2. `/Applications/BambuStudio.app/Contents/MacOS/BambuStudio` (macOS)
3. `/usr/local/bin/bambu-studio`
4. `/usr/bin/bambu-studio`
5. `bambu-studio` on `PATH` (found with `which`)

Set `BAMBU_STUDIO_PATH` to override auto-detection:

```bash
export BAMBU_STUDIO_PATH="/custom/path/to/BambuStudio"
```

## Tool Reference

| Tool | Description |
|---|---|
| `inspect_bambu_cli` | Return the BambuStudio version, binary path and available CLI flags |
| `export_settings` | Export BambuStudio settings (optionally from a `.3mf` project) to JSON |
| `convert_to_3mf` | Convert STL/OBJ files into a `.3mf` project |
| `arrange_project` | Auto-arrange objects on the build plate |
| `orient_project` | Auto-orient objects for printing |
| `slice_project` | Slice a project with machine/process/filament settings |
| `export_plate_png` | Export PNG preview images of plates |
| `export_stls` | Export the objects in a project as individual STL files |
| `validate_project` | Validate a project and report info and warnings |
| `estimate_print` | Estimate print time and filament usage |
| `create_print_package` | Full pipeline: convert, arrange, orient, slice, preview |

## Examples

### convert_to_3mf

```json
{
  "name": "convert_to_3mf",
  "arguments": {
    "files": ["/models/part_0.stl", "/models/part_1.stl"],
    "output": "ramp.3mf"
  }
}
```

### arrange_project

```json
{
  "name": "arrange_project",
  "arguments": {
    "project": "/models/ramp.3mf",
    "allowRotations": true,
    "ensureOnBed": true
  }
}
```

### orient_project

```json
{
  "name": "orient_project",
  "arguments": {
    "project": "/models/ramp.3mf"
  }
}
```

### slice_project

```json
{
  "name": "slice_project",
  "arguments": {
    "project": "/models/ramp.3mf",
    "plate": 0,
    "settings": {
      "machine": "profiles/printers/bambu_x1e.json",
      "process": "profiles/process/petg_strong_030.json",
      "filaments": ["profiles/filament/petg.json"]
    }
  }
}
```

`plate: 0` slices every plate; a positive number slices only that plate.

### export_plate_png

```json
{
  "name": "export_plate_png",
  "arguments": {
    "project": "/models/ramp.3mf",
    "plate": 1,
    "cameraView": 0
  }
}
```

`cameraView`: `0` = Iso, `1` = Top_Front, `2` = Left, `3` = Right, `10`-`12` = Iso variants.

### estimate_print

```json
{
  "name": "estimate_print",
  "arguments": {
    "project": "/models/ramp.3mf",
    "settings": {
      "machine": "profiles/printers/bambu_x1e.json",
      "process": "profiles/process/petg_strong_030.json"
    }
  }
}
```

### create_print_package

```json
{
  "name": "create_print_package",
  "arguments": {
    "files": ["/models/part_0.stl", "/models/part_1.stl"],
    "settings": {
      "machine": "profiles/printers/bambu_x1e.json",
      "process": "profiles/process/petg_strong_030.json",
      "filaments": ["profiles/filament/petg.json"]
    },
    "arrange": true,
    "orient": true,
    "output": "ramp_package.3mf"
  }
}
```
