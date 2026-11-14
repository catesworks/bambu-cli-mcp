---
sidebar_position: 2
---

# Geometry Tools

The `cad-geometry-mcp` server provides mesh geometry operations powered by [manifold-3d](https://github.com/elalish/manifold), a WASM-compiled C++ geometry engine that runs in-process inside Node.js — no Python, no external process.

> **Correction (2026-11-14):** This page used to describe `scale_mesh` as "uniform or per-axis" with a worked example passing `x`/`y`/`z` and `fit_max_dimension` arguments, and it listed tools that were never built (`translate_mesh`, `rotate_mesh`, `boolean_mesh`, `export_mesh`, `export_parts_as_3mf`, `analyze_printability`). The implementation's `scale_mesh` takes one `scale` factor applied equally to all three axes, so those example calls failed. The tool list and examples below now match the code in `src/cad-geometry-mcp/`. Per-axis scaling is an open product decision, not a shipped feature.

## Engine: manifold-3d WASM

manifold-3d is compiled to WebAssembly and loaded directly into the Node.js worker. This means:

- **No subprocess overhead** — geometry runs in the same process as the MCP server
- **Reliable manifold guarantees** — manifold-3d enforces watertight, manifold meshes
- **Fast boolean ops** — the split and connector tools use manifold-3d's boolean operations internally
- **No Python dependency** — unlike OpenSCAD or FreeCAD integrations

## Core Tools

| Tool | Description |
|---|---|
| `inspect_mesh` | Bounds, triangle count, volume, surface area, watertight status, genus |
| `repair_mesh` | Fix normals, merge vertices, remove degenerate faces |
| `scale_mesh` | Uniform scaling by any factor |
| `split_mesh` | Recursive splitting until all parts fit the build volume |
| `lay_flat` | Orient the largest flat face onto the build plate |
| `add_dowel_connectors` | Surface-validated dowel connectors on split seams |
| `generate_assembly_manifest` | Parts, neighbors, connectors, hardware list |

## Workflow Tools

| Tool | Description |
|---|---|
| `make_printable_large_model` | inspect, scale, repair, split, connectors, manifest |
| `repair_and_prepare` | inspect, repair, lay flat |
| `split_with_connectors` | split, connectors, manifest |
| `list_available_engines` | Detect available CAD engines |

Translation, rotation, standalone boolean operations and a mesh export tool are not exposed as MCP tools.

## Examples

### inspect_mesh

```json
{
  "name": "inspect_mesh",
  "arguments": {
    "path": "/models/ramp.stl"
  }
}
```

Response:

```json
{
  "bounds": { "min": [-5, -5, 0], "max": [5, 5, 10], "size": [10, 10, 10] },
  "triangleCount": 12,
  "volume": 1000,
  "surfaceArea": 600,
  "watertight": true,
  "genus": 0
}
```

### scale_mesh

```json
{
  "name": "scale_mesh",
  "arguments": {
    "input": "/models/ramp.stl",
    "output": "/models/ramp_scaled.stl",
    "scale": 4
  }
}
```

Multiplies every axis by the same factor (`4` makes the model four times larger). To shrink, use a factor below 1:

```json
{
  "name": "scale_mesh",
  "arguments": {
    "input": "/models/ramp.stl",
    "output": "/models/ramp_scaled.stl",
    "scale": 0.5
  }
}
```

### split_mesh

```json
{
  "name": "split_mesh",
  "arguments": {
    "input": "/models/ramp_scaled.stl",
    "buildVolume": [256, 256, 256],
    "strategy": "min_parts",
    "outputDir": "/models/parts/"
  }
}
```

Halves oversized parts recursively until every part fits inside `buildVolume`, and writes each part as an STL in `outputDir`.

### add_dowel_connectors

```json
{
  "name": "add_dowel_connectors",
  "arguments": {
    "inputPartsDir": "/models/parts/",
    "connector": {
      "type": "dowel",
      "diameterMm": 6.0,
      "depthMm": 10.0,
      "clearanceMm": 0.2,
      "countPerSeam": 4
    },
    "outputDir": "/models/parts_connected/"
  }
}
```

Detects which faces of adjacent parts share a seam, validates surface contact, and subtracts mating dowel cylinders from each part. See [Connector System](../guides/connectors) for details on how seam detection works.

### make_printable_large_model

```json
{
  "name": "make_printable_large_model",
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
    "outputDir": "/models/output/"
  }
}
```

Omit `connector` to skip connector generation.
