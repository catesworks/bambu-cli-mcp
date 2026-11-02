---
name: Project vision - AI-native manufacturing pipelines
description: bambu-cli-mcp is declarative manufacturing orchestration, not just AI prompt engineering. User envisions a full maker/hobby manufacturing pipeline.
type: project
---

The bambu-cli-mcp + cad-geometry-mcp project is framed as "AI-native manufacturing pipelines" — prompt-driven declarative manufacturing orchestration for hobby/maker workflows.

**Why:** The pipeline turns a natural language prompt into a complete manufacturing package (CAD ops -> geometry validation -> slicer orchestration -> manufacturing output). This is more powerful than individual tools because it chains the full workflow declaratively.

**How to apply:** When building new features, maintain this framing:
- Prompt = manufacturing spec
- MCP tools = execution layer
- Output = ready-to-print manufacturing package

**Future features the user wants (prioritized by their list):**
1. estimate_cost() — material cost calculation
2. estimate_print_time() — parse BambuStudio --estimate-mode output
3. detect_weak_regions() — mesh geometry heuristics for stress analysis
4. suggest_split_locations() — intelligent cut placement along low-stress regions
5. adaptive_connector_generation() — connector type/size based on part geometry
6. support_optimization() — minimize support material in split decisions
7. multi_material_generation() — multi-filament support

**Testing strategy the user wants:**
- Unit: split_cube, split_cylinder, connector_collision, build_volume_validation
- Integration: scale_and_export, split_and_slice, connector_pipeline
- E2E: rc_ramp_large_model, modular_tabletop_jump, multi_plate_skatepark
