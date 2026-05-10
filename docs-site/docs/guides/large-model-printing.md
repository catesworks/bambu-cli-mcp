---
sidebar_position: 1
---

# Printing Large Models

This guide walks through the complete workflow for printing a model larger than the build plate — using an RC car ramp as the example. The `print-large-model` skill automates these steps end-to-end.

## Overview

The RC ramp is 320 mm wide — larger than the 256 mm build plate of the Bambu P1S. The pipeline:

1. Inspect the mesh
2. Repair if needed
3. Scale to fit
4. Split into parts
5. Add connector dowels
6. Export each part as 3MF
7. Slice each part

## Step-by-Step Tool Calls

### 1. Inspect

Check dimensions and manifold status before any operation.

```json
{
  "name": "inspect_mesh",
  "arguments": {
    "input": "/models/rc_ramp.stl"
  }
}
```

Expected response confirms `is_manifold: true` and bounding box exceeds build plate.

### 2. Repair (if needed)

If `is_manifold` is false, repair before proceeding:

```json
{
  "name": "repair_mesh",
  "arguments": {
    "input": "/models/rc_ramp.stl",
    "output": "/models/rc_ramp_repaired.stl"
  }
}
```

Re-inspect after repair to confirm manifold status.

### 3. Scale to Fit

Scale the largest dimension to 252 mm (leaving 4 mm margin inside the 256 mm plate):

```json
{
  "name": "scale_mesh",
  "arguments": {
    "input": "/models/rc_ramp_repaired.stl",
    "output": "/models/rc_ramp_scaled.stl",
    "fit_max_dimension": 252.0
  }
}
```

### 4. Split into Parts

Cut at the midpoint along the X axis:

```json
{
  "name": "split_mesh",
  "arguments": {
    "input": "/models/rc_ramp_scaled.stl",
    "output_dir": "/models/ramp_parts/",
    "cuts": [
      { "axis": "x", "position": 126.0 }
    ]
  }
}
```

This produces `part_0.stl` and `part_1.stl`.

### 5. Add Connector Dowels

Add 6 mm diameter, 10 mm deep dowel connectors at the seam:

```json
{
  "name": "add_dowel_connectors",
  "arguments": {
    "parts_dir": "/models/ramp_parts/",
    "diameter_mm": 6.0,
    "depth_mm": 10.0,
    "clearance_mm": 0.2,
    "output_dir": "/models/ramp_connected/"
  }
}
```

The `clearance_mm` of 0.2 mm creates a press-fit suitable for PLA. Increase to 0.3–0.4 mm for a looser slip-fit.

### 6. Export as 3MF

```json
{
  "name": "export_parts_as_3mf",
  "arguments": {
    "parts_dir": "/models/ramp_connected/",
    "output": "/output/rc_ramp.3mf"
  }
}
```

### 7. Slice Each Part

```json
{
  "name": "slice_model",
  "arguments": {
    "input": "/models/ramp_connected/part_0.stl",
    "output": "/output/ramp_part_0.gcode",
    "profile": "Bambu Lab P1S 0.4 nozzle",
    "filament": "Bambu PLA Basic @BBL P1S"
  }
}
```

Repeat for `part_1.stl`.

## The print-large-model Skill

The `print-large-model` skill (at `print-large-model.skill` in the repo root) encodes this entire workflow as an OMC skill. When invoked, it guides the LLM through each step in order, handling inspection results and branching on repair needs.

To use it with oh-my-claudecode:

```
/oh-my-claudecode:print-large-model input=/models/rc_ramp.stl printer="Bambu Lab P1S"
```

The skill issues all tool calls, monitors outputs, and surfaces errors (non-manifold geometry, parts exceeding build plate) before proceeding.

## Tips

- Always inspect before and after repair — repair can change volume slightly
- For models with organic curves, use more cuts at smaller intervals rather than fewer large cuts
- Connector placement is automatic but you can inspect the seam face area from `inspect_mesh` output to verify adequate connector coverage
- Print the connector parts first as test fits before committing to a full print run
