# Follow-ups — beads sweep (2026-11-14)

A reconcile-and-implement pass over every open bead in this repo. Three PRs came out of it:

- #4 `sweep/docs-accuracy`: ADR and docs-site alignment (bambu-cli-mcp-bjm, -5bc, -khw.1, -o3v)
- #5 `sweep/connectors`: ConnectorSpec union, cylinder leak fix, heat-set insert connectors (bambu-cli-mcp-p8f.1, -ais)
- #6 `sweep/phase5-workflows`: `repair_and_slice` and `estimate_and_package` cross-server workflows, BambuStudio test gate (bambu-cli-mcp-yml, -hg4, -b4t)

## Blocked on the user (decisions)

- **bambu-cli-mcp-bpw**: build per-axis `scale_mesh` scaling, or not? The docs now say uniform-only (PR #4). If yes, `scale` becomes `number | [x, y, z]`, which changes the tool's JSON Schema.
- **bambu-cli-mcp-czr**: pursue the Phase 4 CAD adapters (FreeCAD, Fusion 360, Blender) at all? Options A-D are in the bead. bambu-cli-mcp-4di, -6bk, -1oa and -p74 wait on this.
- **bambu-cli-mcp-gna**: bolt-channel connector geometry. The plan cuts the head counterbore at the seam inside part A, where the bolt head can't be reached once the parts are joined. A design is needed first: counterbore at A's outer face? Nut trap or tapped hole in B? How does `lengthMm` relate to part thickness? The engine union and dispatcher from PR #5 make adding the bolt type mechanical after that.

## Blocked on work (do next)

- **bambu-cli-mcp-4bq**: 7 bambu tools never clean up their temp workspace. A fix has to keep returned paths valid, so it needs a small design choice.
- **bambu-cli-mcp-7em** (P4, conditional): switch `vercel-deploy.yml` to the apps matrix only if a second web app is added.

## Not tracked here

- The "audit other catesworks repos for the `rootDirectory`-unset Vercel bug" item in `2026-09-14-vercel-manual-deploy/FOLLOWUPS.md` concerns other repos, so it has no bead in this repo.

## Known gaps

- The cross-server workflows are tested with fake BambuStudio tool functions. They have not been run end to end against a real BambuStudio install.
- Plan follow-ups left as-is: a type-neutral `ConnectorResult` vocabulary (`malePartId`/`femalePartId` are dowel nouns) and a shared `applyConnectorsToSeams` skeleton. Both make sense once a third connector type lands.
