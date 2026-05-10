---
sidebar_position: 2
---

# Connector System

The `add_dowel_connectors` tool automatically places mating dowel connectors at the seams between split mesh parts. This page explains how seam detection and connector placement work.

## Seam Detection

After a mesh is split by cutting planes, adjacent parts share a planar face at the cut boundary. The connector system identifies these shared faces using **bounding box face matching with overlap validation**:

1. **Candidate face extraction** — for each part, extract all faces whose normal aligns with the cut axis (within a tolerance angle)
2. **Bounding box alignment** — faces from adjacent parts are compared; a seam is confirmed when their projected bounding boxes overlap by at least a minimum area threshold
3. **Overlap validation** — a small set of probe points are tested against both meshes to confirm the faces are truly adjacent (not just bounding-box-adjacent due to geometry noise)

This approach handles non-rectangular seam faces (e.g. a diagonal cut through organic geometry) as long as there is meaningful bounding box overlap.

## Surface-Validated Connector Placement

Once a seam is confirmed, connector positions are chosen by **sphere intersection probing**:

1. A grid of candidate positions is laid out across the seam face
2. For each candidate, a sphere of `diameter_mm / 2` radius is tested against both mesh surfaces
3. Positions where the sphere intersects only the seam face (not interior geometry) are valid connector locations
4. The final set is filtered to ensure connectors are spaced at least `diameter_mm * 2` apart

This prevents connectors from being placed where they would collide with interior walls, ribs, or other features inside the mesh.

## Dowel Connector Specification

| Parameter | Description | Typical value |
|---|---|---|
| `diameter_mm` | Dowel pin diameter | 4–8 mm |
| `depth_mm` | How far the pin penetrates each part | 8–15 mm |
| `clearance_mm` | Radial clearance added to the hole | 0.1–0.4 mm |

The pin side gets a cylinder of exactly `diameter_mm`. The hole side gets a cylinder of `diameter_mm + clearance_mm * 2` to create the fit allowance.

### Fit types by clearance

| Clearance | Fit type | Use when |
|---|---|---|
| 0.1 mm | Interference (press) fit | Permanent joints, high-strength |
| 0.2 mm | Light press fit | Standard assembly, PLA |
| 0.3 mm | Slip fit | Easy assembly, PETG or ABS |
| 0.4 mm | Loose fit | Prints with elephant foot or wide tolerances |

## Example: 3-Part Ramp with Connectors

After splitting a ramp into 3 parts along X at positions 84 mm and 168 mm:

```
Part 0          Part 1          Part 2
[0..84mm]  |  [84..168mm]  |  [168..252mm]
          seam_A           seam_B
```

`add_dowel_connectors` detects `seam_A` (between part_0 and part_1) and `seam_B` (between part_1 and part_2), places connectors at each, and writes 3 updated STL files where:

- part_0 has pin cylinders on its right face
- part_1 has hole cylinders on its left face and pin cylinders on its right face
- part_2 has hole cylinders on its left face

## Future Connector Types

The current implementation supports dowel pins only. Planned additions:

- **Bolt channels** — M3/M4 through-holes with hex nut recesses for mechanical fastening
- **Heat-set insert pockets** — cylindrical pockets sized for M3 heat-set brass inserts
- **Snap-fit clips** — flexible cantilever clips for tool-free assembly

These will be added as additional tools (`add_bolt_connectors`, `add_heatset_connectors`) following the same seam-detection and surface-validation approach.
