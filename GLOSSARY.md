# bambu-cli-mcp

Two MCP servers in one package turn an oversized 3D model into print-ready parts. **cad-geometry-mcp** handles mesh geometry, and **bambu-cli-mcp** drives the BambuStudio slicer. This glossary fixes the words both servers, their docs and their callers use.

## Language

### Shared (both servers)

**Server mode**:
The value of the `--server` flag: `bambu`, `geometry` or `both`. It selects which tool set a process registers. The default is `bambu`.
_Avoid_: profile, flavour, target

**Combined server**:
The single MCP server, named `bambu-cli-mcp-combined`, that registers the tools of both servers when **Server mode** is `both`.
_Avoid_: full server, both-server

**Core tool**:
An MCP tool that does one operation, for example `scale_mesh` or `slice_project`.
_Avoid_: primitive, basic tool

**Workflow tool**:
An MCP tool that runs several engine steps in order and reports them in a `pipeline` array, for example `make_printable_large_model`.
_Avoid_: macro, chain, recipe

**Pipeline**:
The ordered steps that take a source **Mesh** to print-ready output: inspect, repair, scale, split, connectors, manifest, then BambuStudio export.
_Avoid_: flow, job

**Workspace**:
A temporary folder named `bambu-mcp-<id>` with `source/`, `processed/`, `output/` and `logs/` subfolders. Tools keep intermediate files in it.
_Avoid_: temp dir, scratch, sandbox

**Large model**:
A model whose size exceeds the **Build volume**, so it must be split into **Parts** before printing.
_Avoid_: oversized mesh, big model

**Build volume**:
The printable `[x, y, z]` size of the printer in millimetres, for example `[256, 256, 256]`.
_Avoid_: bed size, plate size, build plate (when you mean the size)

### cad-geometry-mcp (mesh geometry)

**Mesh**:
Triangle geometry read from or written to an STL file. Its size, triangle count, volume and **Genus** are reported by `inspect_mesh`.
_Avoid_: model (for the file), object, STL (as a noun for the geometry)

**Manifold**:
A solid built by the manifold-3d WASM library from a **Mesh**. All geometry operations run on a Manifold.
_Avoid_: solid, body, shape

**Watertight**:
A **Mesh** state that is `true` when its **Manifold** has `genus === 0` and status `NoError`.
_Avoid_: closed, sealed, is_manifold

**Genus**:
The number of through-holes in a **Manifold**, as reported by manifold-3d.
_Avoid_: hole count

**Repair**:
Rebuilding a **Mesh** through the manifold-3d constructor, which fixes normals, merges vertices and drops degenerate faces.
_Avoid_: heal, fix, clean

**Lay flat**:
Rotating a **Mesh** so its largest coplanar face points down, then moving it so its lowest point is at Z = 0.
_Avoid_: auto-orient (that is the BambuStudio **Orient**), drop to bed

**Split**:
Cutting a **Mesh** with axis-aligned planes until every piece fits the **Build volume**, or 8 extra halving passes have run.
_Avoid_: slice (that is a BambuStudio term), cut, chop

**Part**:
One piece produced by a **Split**, saved as `part_<id>.stl`.
_Avoid_: piece, chunk, segment, tile

**Part ID**:
The label of a **Part**: `A` to `Z` for the first 26, then `P26`, `P27`, and so on.
_Avoid_: part index, part number

**Fits volume**:
A **Part** flag (`fitsVolume`) that is `true` when every dimension is at most the **Build volume** plus 0.01 mm.
_Avoid_: in bounds, fits plate

**Split strategy**:
The `strategy` value passed to `split_mesh`: `min_parts` (default) or `grid`.
_Avoid_: split mode, algorithm

**Seam**:
The shared cut plane between two **Neighbors**, identified as `<idA>-<idB>`, for example `A-B`.
_Avoid_: joint, cut face, interface, seam_A

**Neighbor**:
A **Part** whose bounding-box face touches another Part's face within 0.5 mm, with overlapping area. Two Neighbors share one **Seam**.
_Avoid_: adjacent part, sibling

**Connector**:
An alignment feature added across a **Seam** so that two **Parts** mate on assembly. The only type implemented is the **Dowel connector**.
_Avoid_: joiner, pin (alone), key

**Dowel connector**:
A **Connector** made of a cylinder added to the **Male part** and a slightly larger hole cut into the **Female part**.
_Avoid_: peg, dowel pin hole

**Connector spec**:
The parameters of a **Connector**: `type`, `diameterMm`, `depthMm`, `clearanceMm`, `countPerSeam`.
_Avoid_: connector config, connector options

**Male part**:
The **Part** of a **Seam** that gets the protruding cylinder. It is the first Part of the pair in sorted file order.
_Avoid_: pin side, positive side

**Female part**:
The **Part** of a **Seam** that gets the hole.
_Avoid_: hole side, socket side, negative side

**Clearance**:
The extra radius in millimetres (`clearanceMm`) added to the **Female part** hole so the dowel fits.
_Avoid_: tolerance, gap, slop

**Surface validation**:
The check that keeps a candidate **Connector** position only if a probe sphere at that point intersects both **Parts** with more than 0.1 mm³ of volume.
_Avoid_: collision check, hit test

**Assembly manifest**:
A JSON file that lists a project's **Parts**, their **Neighbors**, its **Connectors** and its **Hardware**. It is written by `generate_assembly_manifest`.
_Avoid_: BOM, parts list, manifest (alone)

**Hardware**:
The list of non-printed items needed to assemble the **Parts**. It is a field of the **Assembly manifest** and is always empty today.
_Avoid_: BOM, fasteners, accessories

**CAD engine**:
A geometry backend the server can detect: `manifold`, `freecad`, `blender` or `fusion`. Only `manifold` is used by the tools.
_Avoid_: backend, kernel, CAD tool

### bambu-cli-mcp (BambuStudio slicer)

**BambuStudio**:
Bambu Lab's slicer application. The server calls its binary in headless CLI mode. The binary is found through `BAMBU_STUDIO_PATH`, known install paths, or `which bambu-studio`.
_Avoid_: Bambu Studio, Bambu slicer, the CLI (alone)

**Project**:
A BambuStudio `.3mf` file holding one or more **Objects**, laid out on **Plates**. It is the `project` parameter of most BambuStudio tools.
_Avoid_: 3MF (alone), model file, scene

**Object**:
One model item inside a **Project**, for example one imported STL.
_Avoid_: part (that is a **Split** output), mesh

**Plate**:
A numbered build plate inside a **Project**. In `--slice` and `--export-png`, `0` means all Plates and `i` means Plate `i`.
_Avoid_: bed, sheet, page

**Arrange**:
BambuStudio's automatic layout of **Objects** on a **Plate** (`--arrange 1`), with rotation optionally allowed.
_Avoid_: pack, layout, nest

**Orient**:
BambuStudio's automatic rotation of **Objects** into a printable pose (`--orient 1`).
_Avoid_: lay flat (that is the geometry tool), rotate

**Ensure on bed**:
The BambuStudio option (`--ensure-on-bed`) that moves **Objects** down to rest on the **Plate**.
_Avoid_: drop, ground

**Slice**:
Running BambuStudio on a **Project** with **Settings** to compute toolpaths, and exporting the result as a **Sliced project**.
_Avoid_: split (that is the geometry tool), compile, G-code export

**Sliced project**:
A `.3mf` written after a **Slice**, named for example `sliced.3mf` or `<name>_sliced.3mf`.
_Avoid_: G-code, print file, output

**Settings**:
The `machine`, `process` and `filaments` JSON files passed to BambuStudio with `--load-settings` and `--load-filaments`.
_Avoid_: config, presets, profile (see Flagged ambiguities)

**Machine settings**:
The **Settings** file that describes the printer, for example `bambu_x1e.json`.
_Avoid_: printer profile, printer config

**Process settings**:
The **Settings** file that describes print parameters such as layer height and speed, for example `petg_strong_030.json`.
_Avoid_: print profile, quality preset

**Filament settings**:
The **Settings** files that describe each loaded filament (temperatures, flow).
_Avoid_: material profile, material settings

**Print estimate**:
The print time in minutes and filament use in grams that `estimate_print` parses from a BambuStudio `--estimate-mode` run.
_Avoid_: quote, cost (cost is not computed)

**Plate preview**:
A PNG render of a **Plate** from a numbered **Camera view**, written by `--export-png`.
_Avoid_: thumbnail, screenshot, snapshot

**Camera view**:
The integer angle for a **Plate preview**: `0` = Iso, `1` = Top_Front, `2` = Left, `3` = Right, `10`-`12` = Iso variants.
_Avoid_: angle, perspective

**Print package**:
The output of `create_print_package`: a **Project**, an optional **Sliced project**, and **Plate previews**, all in one **Workspace**.
_Avoid_: bundle, print job, manufacturing package

## Relationships

- **Server mode** `both` creates one **Combined server**. `bambu` and `geometry` each create one server with its own tool set.
- A **Workflow tool** runs several **Core tool** operations by calling engine functions directly, never other MCP tools.
- Each tool call that needs intermediate files creates one **Workspace**.
- A **Large model** is a **Mesh** whose size exceeds the **Build volume**. A **Split** turns it into one or more **Parts**.
- Each **Part** has one **Part ID** and one **Fits volume** flag.
- Two **Neighbors** share exactly one **Seam**. Each **Seam** has one **Male part** and one **Female part**.
- A **Seam** gets up to `countPerSeam` **Dowel connectors**, keeping only positions that pass **Surface validation**.
- An **Assembly manifest** lists many **Parts**, many **Connectors** and one **Hardware** list.
- **Split** output (**Parts** as STL) becomes BambuStudio input: one **Project** per **Part**, each holding one **Object**.
- A **Project** holds many **Objects** on one or more **Plates**.
- A **Slice** of a **Project** uses one **Machine settings** file, one **Process settings** file and zero or more **Filament settings** files, and writes one **Sliced project**.
- A **Print package** contains one **Project**, at most one **Sliced project** and zero or more **Plate previews**.

## Flagged ambiguities

- "repair and prepare" vs "repair and slice": the MCP tool is `repair_and_prepare`, but its schema is `RepairAndSliceSchema` and its handler is `repairAndSlice()`. It inspects, repairs and lays flat. It never slices. Suggested: say "repair and prepare". "Slice" is reserved for the BambuStudio **Slice**.
- "build plate" is used for three things: the printer's physical bed (`lay_flat`, `arrange_project` descriptions), a numbered **Plate** inside a **Project**, and the printer's size ("larger than the 256 mm build plate" in `docs-site/docs/guides/large-model-printing.md`). Suggested: use **Plate** for the 3MF plate and **Build volume** for the size. Keep "build plate" only for the physical bed.
- "split" vs "slice": the docs use both for cutting a mesh. Suggested: **Split** means cutting a **Mesh** into **Parts**. **Slice** means only BambuStudio toolpath generation.
- "part" vs "object" vs "model" vs "mesh": all four describe printable things in `README.md`. Suggested: **Mesh** is the geometry, **Part** is a **Split** output, **Object** is an item inside a **Project**, and "model" is only the user's informal word (as in **Large model**).
- **Part ID** format: the code writes `part_A.stl` and seams `A-B`. `docs-site/docs/guides/connectors.md` and `docs-site/docs/tools/geometry-tools.md` show `part_0.stl` and `seam_A`. Unresolved: the docs need to change to match the code.
- **Watertight** is computed as `genus === 0 && status === "NoError"`, so a closed solid with a through-hole (genus 1) reports `watertight: false`. The docs also say `is_manifold`. Unresolved: is the intended meaning "closed manifold" or "closed manifold with no through-holes"?
- "settings" vs "profile": the schemas and CLI flags say **Settings** (`machine`, `process`, `filaments`). `README.md`, `docs/setup.md` and `docs-site` say "profiles" (`profiles/printers/`, `list_profiles`, `"profile": "Bambu Lab P1S 0.4 nozzle"`). Resolved here as **Settings**. "Profile" is only the folder-layout word in the setup docs.
- "manifest" means three different JSON shapes. `generate_assembly_manifest` writes the **Assembly manifest**. `make_printable_large_model` and `split_with_connectors` each write their own `manifest.json` with different fields. The `print-large-model` skill expects `assembly_manifest.json`, `connector_manifest.json` and `print_summary.json`. Unresolved: only the first is called **Assembly manifest** here.
- "project" means a **Project** (`.3mf` file) in BambuStudio tools. It is a free-text name in the **Assembly manifest** (`project: "untitled"`), and the input STL path in the `make_printable_large_model` manifest (`project: params.input`). Unresolved: keep **Project** for the `.3mf` file.
- **Split strategy**: `split_mesh` accepts `min_parts` or `grid`, but both run the same grid-then-halve algorithm. The value is only echoed back. Unresolved: the term promises a choice the code does not offer.
- "workflow" means a **Workflow tool** in `src/cad-geometry-mcp/tools/workflows.ts` and ADR 006, but a JSON list of manual tool steps in `examples/*.json` ("See `examples/` for more workflow examples"). Resolved: **Workflow tool** is the MCP tool. The example files are step lists.
- "monorepo": ADR 001, ADR 004 and `README.md` call the repo a pnpm monorepo with `packages/*`. It is one package, with both servers under `src/`. Not a domain term. The two servers are better described as two **Server modes** of one package.
- `docs-site/docs/tools/*.md` documents tools that do not exist in the code (`slice_model`, `arrange_models`, `list_profiles`, `orient_model`, `validate_model`, `repair_model` and others). The vocabulary in this glossary follows the 22 tool names registered in `src/*/server.ts`.
