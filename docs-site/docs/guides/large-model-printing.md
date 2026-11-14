---
sidebar_position: 1
---

# Printing Large Models

This guide walks through the complete workflow for printing a model larger than the build plate — using an RC car ramp as the example. The `print-large-model` skill automates these steps end-to-end.

## Overview

The RC ramp is 320 mm wide — larger than the 256 mm build plate of the Bambu P1S. The pipeline:

1. Inspect the mesh
2. Repair if needed
3. Scale (optional)
4. Split into parts that fit the build volume
5. Add connector dowels
6. Package and slice each part

The `make_printable_large_model` workflow tool runs steps 1-5 in one call; the steps below show the individual tools.

## Step-by-Step Tool Calls

### 1. Inspect

Check dimensions and watertight status before any operation.

```json
{
  "name": "inspect_mesh",
  "arguments": {
    "path": "/models/rc_ramp.stl"
  }
}
```

The response's `bounds.size` shows the model exceeds the build plate, and `watertight` reports whether repair is needed.

### 2. Repair (if needed)

If `watertight` is false, repair before proceeding:

```json
{
  "name": "repair_mesh",
  "arguments": {
    "input": "/models/rc_ramp.stl",
    "output": "/models/rc_ramp_repaired.stl"
  }
}
```

Re-inspect after repair to confirm watertight status.

### 3. Scale (optional)

`scale_mesh` multiplies all three axes by the same factor. To print the ramp at 150%:

```json
{
  "name": "scale_mesh",
  "arguments": {
    "input": "/models/rc_ramp_repaired.stl",
    "output": "/models/rc_ramp_scaled.stl",
    "scale": 1.5
  }
}
```

To fit a target size instead, divide the target by the current largest dimension from `inspect_mesh` (for example `252 / 320 = 0.7875`) and pass that as `scale`.

### 4. Split into Parts

Split recursively until every part fits the build volume:

```json
{
  "name": "split_mesh",
  "arguments": {
    "input": "/models/rc_ramp_scaled.stl",
    "buildVolume": [256, 256, 256],
    "strategy": "min_parts",
    "outputDir": "/models/ramp_parts/"
  }
}
```

### 5. Add Connector Dowels

Add 6 mm diameter, 10 mm deep dowel connectors at each seam:

```json
{
  "name": "add_dowel_connectors",
  "arguments": {
    "inputPartsDir": "/models/ramp_parts/",
    "connector": {
      "type": "dowel",
      "diameterMm": 6.0,
      "depthMm": 10.0,
      "clearanceMm": 0.2,
      "countPerSeam": 2
    },
    "outputDir": "/models/ramp_connected/"
  }
}
```

The `clearanceMm` of 0.2 mm creates a press-fit suitable for PLA. Increase to 0.3–0.4 mm for a looser slip-fit.

### 6. Package and Slice Each Part

`create_print_package` converts the part to 3MF, arranges, orients, slices and exports previews:

```json
{
  "name": "create_print_package",
  "arguments": {
    "files": ["/models/ramp_connected/part_A.stl"],
    "settings": {
      "machine": "profiles/printers/bambu_p1s.json",
      "process": "profiles/process/pla_020.json",
      "filaments": ["profiles/filament/pla.json"]
    },
    "output": "ramp_part_A.3mf"
  }
}
```

Repeat for each part. One 3MF per part avoids BambuStudio CLI stacking objects on one plate.

## The print-large-model Skill

The `print-large-model` skill (at `print-large-model.skill` in the repo root) encodes this entire workflow as an OMC skill. When invoked, it guides the LLM through each step in order, handling inspection results and branching on repair needs.

To use it with oh-my-claudecode:

```
/oh-my-claudecode:print-large-model input=/models/rc_ramp.stl printer="Bambu Lab P1S"
```

The skill issues all tool calls, monitors outputs, and surfaces errors (non-manifold geometry, parts exceeding build plate) before proceeding.

## Tips

- Always inspect before and after repair — repair can change volume slightly
- `split_mesh` picks cut planes automatically; use a smaller `buildVolume` than the printer allows if you want smaller parts
- Connector placement is automatic and surface-validated; check the `add_dowel_connectors` result to confirm each seam got the connectors you asked for
- Print the connector parts first as test fits before committing to a full print run
