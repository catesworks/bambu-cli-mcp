---
sidebar_position: 2
---

# Geometry Tools

The `cad-geometry-mcp` server provides mesh geometry operations powered by [manifold-3d](https://github.com/elalish/manifold), a WASM-compiled C++ geometry engine that runs in-process inside Node.js — no Python, no external process.

## Engine: manifold-3d WASM

manifold-3d is compiled to WebAssembly and loaded directly into the Node.js worker. This means:

- **No subprocess overhead** — geometry runs in the same process as the MCP server
- **Reliable manifold guarantees** — manifold-3d enforces watertight, manifold meshes
- **Fast boolean ops** — union, difference, intersection at native speed
- **No Python dependency** — unlike OpenSCAD or FreeCAD integrations

## Core Tools

| Tool | Description |
|---|---|
| `inspect_mesh` | Report vertex count, face count, bounding box, volume, surface area, manifold status |
| `repair_mesh` | Fix non-manifold geometry, fill holes, remove degenerate faces |
| `scale_mesh` | Scale uniformly or per-axis; optionally fit to max dimension |
| `translate_mesh` | Move mesh by X/Y/Z offset |
| `rotate_mesh` | Rotate around X, Y, or Z axis by degrees |
| `boolean_mesh` | Union, difference, or intersection of two meshes |
| `export_mesh` | Write mesh to STL or OBJ |

## Workflow Tools

| Tool | Description |
|---|---|
| `split_mesh` | Split a mesh into parts by cutting planes or connected components |
| `add_dowel_connectors` | Detect seams between parts and add mating dowel holes/pins |
| `export_parts_as_3mf` | Package multiple parts into a single 3MF archive |
| `analyze_printability` | Check each part for overhangs, thin walls, minimum feature size |

## Examples

### inspect_mesh

```json
{
  "name": "inspect_mesh",
  "arguments": {
    "input": "/models/ramp.stl"
  }
}
```

Response:

```json
{
  "vertices": 15420,
  "faces": 30836,
  "bounding_box": {
    "min": [0, 0, 0],
    "max": [320.5, 180.2, 95.0]
  },
  "volume_cm3": 482.3,
  "surface_area_cm2": 1204.7,
  "is_manifold": true
}
```

### scale_mesh

```json
{
  "name": "scale_mesh",
  "arguments": {
    "input": "/models/ramp.stl",
    "output": "/models/ramp_scaled.stl",
    "fit_max_dimension": 256.0
  }
}
```

Scales the mesh so its longest bounding box dimension equals 256 mm, preserving aspect ratio.

Alternatively, scale per-axis:

```json
{
  "name": "scale_mesh",
  "arguments": {
    "input": "/models/ramp.stl",
    "output": "/models/ramp_scaled.stl",
    "x": 0.5,
    "y": 0.5,
    "z": 0.5
  }
}
```

### split_mesh

```json
{
  "name": "split_mesh",
  "arguments": {
    "input": "/models/ramp_scaled.stl",
    "output_dir": "/models/parts/",
    "cuts": [
      { "axis": "x", "position": 128.0 },
      { "axis": "x", "position": 64.0 }
    ]
  }
}
```

Produces `/models/parts/part_0.stl`, `part_1.stl`, `part_2.stl`. Each cut is a planar slice perpendicular to the specified axis.

### add_dowel_connectors

```json
{
  "name": "add_dowel_connectors",
  "arguments": {
    "parts_dir": "/models/parts/",
    "diameter_mm": 6.0,
    "depth_mm": 10.0,
    "clearance_mm": 0.2,
    "output_dir": "/models/parts_connected/"
  }
}
```

Detects which faces of adjacent parts share a seam, validates surface contact, and subtracts mating dowel cylinders from each part. See [Connector System](../guides/connectors) for details on how seam detection works.
