# Docs/ADR Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use beads-superpowers:executing-plans to implement this plan task-by-task. Each Task becomes a bead (`bd create -t task --parent <epic-id>`). Steps within tasks use checkbox (`- [ ]`) syntax for human readability.

**Status:** pending approval (planning-only artifact; no docs have been touched)

**Revision:** v2 — revised after an Architect review (round 1) verified this plan's core claims are true but found: a wrong line number (285, not 284), a scope hole (the v1 plan fixed 1 of 6 real `per-axis` mentions in this repo, including a published docs-site page with a worked JSON example that would fail against the real schema), a citation to a gitignored/untracked file as the sole authority inside a committed ADR, a self-contradicting Verification Step, a Markdown blockquote bug that would make the "superseded" annotation render as ordinary live content, a self-inconsistent application of RALPLAN-DR Principle 1 (Task 1 silently rewrote text while Task 2 preserved-and-annotated the same class of defect), and a one-sided Option A/B framing that suppressed the source audit's own evidence rating the per-axis gap "High" severity. A paired Critic review was planned but the session was interrupted before it returned; this revision proceeds on the Architect findings alone (independently verified — the reviewer ran the actual greps and git commands, not just read the plan), with a note to re-review before merge. See Changelog for the full list.

**Goal:** Fix ALL real `scale_mesh` "per-axis" claims across this repo — not just the one ADR-006 bullet v1 targeted — and annotate ADR-004's device-control tool list as superseded/non-goal, using one consistent correction convention across both fixes.

**Architecture:** Docs-only changes, no code touched. v2 adds a third task (v1 only had two) and a shared convention: every correction is (1) fixed in place AND (2) logged in a dated, self-contained "Correction Log" entry near the top of the affected file, so no fix is a silent rewrite and no fix relies on a gitignored path as its sole justification.

**Tech Stack:** Markdown.

## Global Constraints

- No source code changes.
- Do not alter `README.md`'s `scale_mesh` description (`README.md:110`, "Uniform scaling by any factor") — it is already correct.
- **(v2)** Every corrected file gets one "Correction Log" entry per correction, dated `2026-09-05`, placed near the top of the file (directly under its title/status line). The entry states what was wrong, what it now says, and why — quoted inline, not just cited by path — so the correction is self-contained even if the reader has no access to `.omc/`/`.omx/` (both gitignored, confirmed via `git ls-files .omc .omx` returning 0 tracked files).
- **(v2)** This plan does not silently expand scope to "fix every doc anywhere" — it fixes every `scale_mesh` "per-axis" mention found by an explicit repo-wide grep (Task 3), and explicitly calls out (Out of Scope, below) a larger, separate docs-site drift issue it deliberately does not fix.

## RALPLAN-DR Summary

**Principles:**
1. ADRs document decisions as understood at a point in time — apply ONE consistent remedy to every correction: fix the text in place AND add a dated Correction Log entry. **(v2 fix — Principle 1 was self-contradicted in v1):** v1's Task 1 silently rewrote ADR-006's line with no note (acceptance criterion literally forbade adding one), while Task 2 kept the wrong text rendered and only annotated around it. Both tasks now use the same rule.
2. Fix the actual inaccuracy; do not expand scope into implementing the described-but-missing behavior (that's a separate decision — see the rebalanced Options section below, which no longer presumes this is obviously correct).
3. **(v2, new)** A correction must be discoverable via a repo-wide search, not just the one location the original audit happened to cite — `grep -rn "per-axis"` across the whole repo, not just the two files the source gap-analysis mentioned.
4. **(v2, new)** A committed document's citations must be reachable by any reader with just the git history — do not cite a gitignored path (`.omc/`, `.omx/`) as sole justification for a claim inside a committed file; quote the substance inline instead.

**Decision Drivers (top 5 — expanded from 3 in v1):**
1. `docs/adr/006-workflow-orchestration.md:285` (v2: corrected from v1's wrong citation of `:284`) lists tool #3 as `scale_mesh — Uniform or per-axis scaling`, but `ScaleMeshSchema` (`src/cad-geometry-mcp/schemas/tools.ts:12-16`) takes a single `scale: number` factor and `scaleMesh()` (`src/cad-geometry-mcp/engines/manifold-engine.ts:194-217`) calls `manifold.scale([factor, factor, factor])` — uniform on all 3 axes.
2. **(v2, new)** A repo-wide `grep -rn "per-axis"` finds the SAME false claim repeated independently in 5 more places, not just the one v1 fixed: `docs/adr/004-mcp-server-architecture.md:207` ("Scale mesh (uniform or per-axis)"), `docs/adr/005-manifold-3d-usage.md:10` ("Scale meshes uniformly or per-axis") and `:182` ("`scale_mesh`: Scale by factor or per-axis"), and `docs-site/docs/tools/geometry-tools.md:24` (a tool-reference table entry) and `:83-95` (a **worked JSON example** passing `x`/`y`/`z` arguments to `scale_mesh` — since `ScaleMeshSchema` has no `.strict()`, those keys are silently stripped by Zod and the call fails on the missing required `scale` field. This is the highest-blast-radius site of the six: a real user following the published docs-site gets a failing tool call, not just a wrong internal reference doc).
3. `docs/adr/004-mcp-server-architecture.md:190-203` lists `bambu-cli-mcp`'s scope as including live device control; none of these exist — the actual 11 tools (`src/bambu-cli-mcp/server.ts:39-108`) are all local-file/CLI operations.
4. **(v2, revised)** The non-goal justification for Driver 3 lives in `.omx/specs/deep-interview-bambu-cad-mcp-architecture.md:49-53`, which is gitignored (confirmed: `git ls-files .omx` returns 0 tracked files; `.omc/` is also ignored per `.gitignore:4`). v1 cited this path as the ADR-004 annotation's sole authority — any reader without this machine's untracked local state gets a dangling citation on exactly the claim carrying the note's whole weight. v2's annotation quotes the non-goal reasoning inline instead of relying on the citation alone.
5. **(v2, new)** The source audit this plan is derived from (`.omx/plans/bambu-cad-mcp-gap-analysis.md:45, 50, 104, 146` — also untracked, referenced here for this plan's own internal traceability only, not as a reader-facing citation) rates the `scale_mesh` per-axis mismatch **"High"** severity with an explicit blast-radius note, and ALREADY prescribes a specific backward-compatible implementation path (`scale: z.union([z.number().positive(), z.tuple([...])])`) and test strategy if per-axis scaling is ever built. v1's Options section never surfaced this evidence, making Option B look weaker than the plan's own source material supports.

**Viable Options (v2: rebalanced — v1 gave Option A no stated cons and used prejudicial language against Option B):**

- **Option A — Correct the text in place + Correction Log (chosen for Task 1-3, this plan):** Fix every per-axis mention to state uniform-only behavior; add a dated Correction Log entry per file explaining the change.
  - Pros: fixes the actual defect (wrong claim) directly; no new code surface; resolves the highest-blast-radius site (docs-site's worked example) that currently sends a real user's honest attempt at per-axis scaling to a failing tool call.
  - Cons **(v2, stated explicitly — v1 omitted this entirely):** does nothing to give users what 6 independent, dated restatements of "per-axis" (across 3 ADRs and a published docs site, including a worked code example) suggest they actually want; the underlying gap-analysis this plan derives from rates the mismatch "High" severity and already specifies a cheap, backward-compatible implementation path that this option leaves unbuilt.
- **Option B — Implement per-axis `scale_mesh` scaling** instead of (or in addition to) fixing the wording:
  - Pros: per-axis scaling (XY shrinkage compensation vs. Z layer-height compensation) is a standard print-prep need; the gap-analysis this plan derives from already specifies the implementation (`manifold.scale([fx,fy,fz])` — a ~5-line change to `manifold-engine.ts:194-217` plus a `z.union` on `ScaleMeshSchema`, fully backward compatible with existing single-number callers) and test strategy; six independent restatements across three ADRs plus a published worked example is a pattern of sustained intent, not a typo.
  - Cons: widening `scale`'s type changes the JSON Schema every MCP client caches for this tool — a real API contract change, which is a meaningfully different kind of risk than a docs-only fix and arguably deserves its own review/approval rather than riding in on a "docs alignment" plan; and it does nothing for ADR-004's unrelated device-control drift (Task 2), so Option B can only ever be a partial alternative to this plan, not a full replacement.

**Invalidation rationale (v2, corrected):** neither option is invalidated. v1's invalidation of Option B was circular ("no requirement anywhere — only the ADR's own wording implies it should exist," while the same plan treats ADR wording as authoritative enough to justify Task 2's historical-preservation approach) and ignored favorable evidence already present in this plan's own source audit. This plan proceeds with Option A because it is the plan explicitly scoped and requested (fix the docs), and creates a specific, separate follow-up recommendation (below) for a human decision on Option B, rather than silently picking a side on a genuine, evidenced feature trade-off.

**Recommended follow-up (v2, new — not part of this plan's own tasks):** File a separate feature bead, "Implement per-axis `scale_mesh` scaling," citing the gap-analysis's own severity rating and prescribed implementation path. This plan's Task 3 fixes the DOCS; whether to also build the FEATURE is a product decision for the user, surfaced here rather than decided silently either way.

---

### Task 1: Fix `scale_mesh` description in ADR-006 (v2: corrected line number, added Correction Log)

**Files:**
- Modify: `docs/adr/006-workflow-orchestration.md:285` (v2: was incorrectly cited as `:284` in v1 — verified via `grep -n "scale_mesh" docs/adr/006-workflow-orchestration.md`)
- Modify: `docs/adr/006-workflow-orchestration.md` near its title/status header (new Correction Log entry, v2)

**Interfaces:** N/A (docs-only)

**Acceptance Criteria:**
- Line 285's tool summary entry for `scale_mesh` reads `Uniform scaling by any factor` (matching `README.md:110` verbatim) instead of `Uniform or per-axis scaling`.
- A Correction Log entry exists near the top of the file, dated, stating the original wrong text and the reason for the fix — **v2 change**: v1's acceptance criteria explicitly forbade adding any note ("No other line ... is changed"); this contradicted Principle 1 and is corrected here.
- No other line in `006-workflow-orchestration.md` is changed.

- [ ] **Step 1: Add the Correction Log entry**

Near the top of `docs/adr/006-workflow-orchestration.md` (directly under its title/status line), add:

```markdown
> **Correction (2026-09-05):** Tool Summary item 3 originally read "scale_mesh — Uniform or per-axis scaling." The implementation (`src/cad-geometry-mcp/schemas/tools.ts:12-16`, `src/cad-geometry-mcp/engines/manifold-engine.ts:194-217`) is uniform-only — `scale: number` applied equally to all 3 axes. Corrected below. Per-axis scaling remains a candidate future feature; see the project's backlog if pursuing it.
```

- [ ] **Step 2: Edit line 285**

Change `docs/adr/006-workflow-orchestration.md:285` from:
```
3. `scale_mesh` — Uniform or per-axis scaling
```
to:
```
3. `scale_mesh` — Uniform scaling by any factor
```

- [ ] **Step 3: Verify**

Run: `grep -n "per-axis" docs/adr/006-workflow-orchestration.md` — expect NO matches outside the Correction Log entry itself (the log entry legitimately mentions "per-axis" while explaining the correction — this is expected and correct, not a leftover defect).
Run: `grep -n "scale_mesh" docs/adr/006-workflow-orchestration.md README.md` — both non-log lines now read "Uniform scaling by any factor."

- [ ] **Step 4: Commit**

```bash
git add docs/adr/006-workflow-orchestration.md
git commit -m "docs: fix scale_mesh ADR description and log the correction"
```

---

### Task 2: Fix device-control scope drift in ADR-004 (v2: delete-and-log instead of preserve-and-annotate)

**v2 change of approach:** v1 kept the wrong 11-bullet device-control list rendered on the page inside a blockquote whose bullets weren't actually `>`-prefixed (a Markdown bug that would make the list render as ordinary live content, defeating the annotation entirely) and cited a gitignored file as its sole justification. v2 applies the SAME rule as Task 1: fix the text, log the correction. The wrong list is removed from the live page (available in `git log -p` for anyone who wants the historical draft) and replaced with the actual tool list; the Correction Log entry quotes the non-goal reasoning inline so it doesn't depend on a gitignored citation.

**Files:**
- Modify: `docs/adr/004-mcp-server-architecture.md:190-203` (the "Server 1: bambu-cli-mcp (11 tools)" scope list)
- Modify: `docs/adr/004-mcp-server-architecture.md` near its title/status header (new Correction Log entry)

**Interfaces:** N/A (docs-only)

**Acceptance Criteria:**
- The device-control bullet list is replaced with the actual 11 implemented tool names.
- A Correction Log entry near the top of the file states: what the original scope draft said, that it was never implemented, and that live device/cloud control is an explicit non-goal — with the non-goal reasoning quoted inline (not solely cited by path, per Decision Driver 4).
- `grep -c "Correction" docs/adr/004-mcp-server-architecture.md` returns exactly the number of Correction Log entries added by this task (1) plus however many Task 3 adds to this same file (1 more, for the `:207` per-axis mention) — **v2 fix**: v1's Verification Step 2 asserted a specific count without checking it matched the text v1 itself proposed (the proposed replacement used the word "superseded" twice, contradicting its own "expect one match" check). v2's verification step is written against the actual final text, not asserted independently of it.

- [ ] **Step 1: Add the Correction Log entry**

Near the top of `docs/adr/004-mcp-server-architecture.md`:

```markdown
> **Correction (2026-09-05):** The original "Server 1: bambu-cli-mcp" scope draft below listed live device/print-queue control (query/cancel/pause/resume print jobs, device settings). None of that was implemented, and it is an explicit non-goal for this project — the goal is a local-file/BambuStudio-CLI wrapper, not a live printer/cloud integration, so that live-control work is intentionally out of scope rather than merely postponed. The actual 11 implemented tools are listed below; the original draft is preserved in git history (`git log -p -- docs/adr/004-mcp-server-architecture.md`) for anyone who wants it.
```

- [ ] **Step 2: Replace the scope list**

Replace `docs/adr/004-mcp-server-architecture.md:190-203`:
```
### Tool Count and Scope

**Server 1: bambu-cli-mcp** (11 tools)
- Query device status
- List connected devices
- Export model to device
- Get print status
- Cancel print job
- Pause print job
- Resume print job
- Get device settings
- Set device settings
- Slice model (invoke BambuStudio slicer)
- Query available filament profiles
```
with:
```
### Tool Count and Scope

**Server 1: bambu-cli-mcp** (11 tools) — all local-file/BambuStudio-CLI operations, see Correction above
- `inspect_bambu_cli`
- `export_settings`
- `convert_to_3mf`
- `arrange_project`
- `orient_project`
- `slice_project`
- `export_plate_png`
- `export_stls`
- `validate_project`
- `estimate_print`
- `create_print_package`
```

- [ ] **Step 3: Verify**

Run: `grep -n "Correction" docs/adr/004-mcp-server-architecture.md` — expect exactly 1 match after this task (Task 3 adds a 2nd, separate Correction entry to this same file for the `:207` per-axis line — verify the count again after Task 3, not here).
Run: `grep -n "Query device status\|Cancel print job" docs/adr/004-mcp-server-architecture.md` — expect NO matches (the aspirational list is fully replaced, not partially).

- [ ] **Step 4: Commit**

```bash
git add docs/adr/004-mcp-server-architecture.md
git commit -m "docs: replace ADR-004's aspirational device-control list with actual tools, log the correction"
```

---

### Task 3: Fix the remaining 5 `per-axis` mentions found by a repo-wide grep (v2, new task — closes the scope hole)

**v1 fixed 1 of 6 real occurrences and its own Verification Step 1 (`grep per-axis docs/adr/006...` → no matches) passed while certifying an incomplete fix.** This task fixes the other 5, found via `grep -rn "per-axis" --include="*.md"` across the whole repo (Decision Driver 2).

**Files:**
- Modify: `docs/adr/004-mcp-server-architecture.md:207` (same file Task 2 touches — this is a SEPARATE line and a separate Correction Log addendum, not a duplicate of Task 2's edit)
- Modify: `docs/adr/005-manifold-3d-usage.md:10` and `:182`
- Modify: `docs-site/docs/tools/geometry-tools.md:24` and `:83-95`

**Interfaces:** N/A (docs-only)

**Acceptance Criteria:**
- All 5 remaining sites are fixed to state uniform-only scaling, using the same "fix text + Correction Log entry" convention as Tasks 1-2 (one shared Correction Log entry per FILE is sufficient if a file has multiple per-axis mentions, e.g. `005-manifold-3d-usage.md`'s two sites and `geometry-tools.md`'s two sites can each share one entry per file).
- `docs-site/docs/tools/geometry-tools.md:83-95`'s worked JSON example (currently showing `x`/`y`/`z` arguments) is replaced with a real, schema-valid example using the actual `scale` field — this is the highest-priority fix in this task (Decision Driver 2): it is the one site where a real user following the docs gets a failing tool call, not just a wrong internal reference.
- A repo-wide `grep -rn "per-axis" --include="*.md" .` (excluding each file's own Correction Log entries, which legitimately mention "per-axis" while explaining what was fixed) returns zero remaining FALSE claims.

- [ ] **Step 1: Fix `docs/adr/004-mcp-server-architecture.md:207`**

Add a second Correction Log entry (or extend Task 2's, if not yet committed) noting this separate line; change:
```
- Scale mesh (uniform or per-axis)
```
to:
```
- Scale mesh (uniform, any factor)
```

- [ ] **Step 2: Fix `docs/adr/005-manifold-3d-usage.md:10` and `:182`**

Add one Correction Log entry near the top of this file covering both sites; change line 10 from `Scale meshes uniformly or per-axis` to `Scale meshes uniformly by any factor`, and line 182 from `` `scale_mesh`: Scale by factor or per-axis `` to `` `scale_mesh`: Scale uniformly by a single factor ``.

- [ ] **Step 3: Fix `docs-site/docs/tools/geometry-tools.md:24` and `:83-95`**

Change line 24's table entry from `Scale uniformly or per-axis; optionally fit to max dimension` to `Scale uniformly by any factor; optionally fit to max dimension`.

Replace the `:83-95` worked example — CURRENT (broken against the real schema):
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
with a schema-valid example:
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
and change the preceding prose "Alternatively, scale per-axis:" to "Alternatively, scale by a different factor:". Add a Correction Log entry near the top of `geometry-tools.md` covering both site fixes.

- [ ] **Step 4: Verify with a repo-wide grep**

Run: `grep -rn "per-axis" --include="*.md" docs/ docs-site/` — every remaining match must be inside a Correction Log entry (identifiable by the `> **Correction (2026-09-05):**` prefix on that line or the immediately preceding line), not a live claim.

- [ ] **Step 5: Commit**

```bash
git add docs/adr/004-mcp-server-architecture.md docs/adr/005-manifold-3d-usage.md docs-site/docs/tools/geometry-tools.md
git commit -m "docs: fix remaining per-axis scale_mesh claims across ADR-004, ADR-005, and the docs site"
```

---

## Out of Scope (explicit, not silent)

- **`docs-site/docs/tools/geometry-tools.md` documents 4 tools that don't exist in `src/`:** `translate_mesh`, `rotate_mesh`, `boolean_mesh`, `export_mesh` (0 occurrences anywhere in `src/`, confirmed by grep). This is a larger docs-site accuracy problem than "per-axis scaling," and conflating it with this plan's narrower scope would make this plan's own review harder to reason about. **Recommended:** file a separate bead, "Audit docs-site for tools that don't exist in src/," rather than folding it into this plan's Task 3.
- **Whether to implement per-axis `scale_mesh` scaling** (Option B above) — deliberately left as a recommended follow-up bead, not a silent yes or no, per Production-Grade Doctrine (surfacing a genuine, evidenced trade-off rather than deciding it inside a docs-fix plan).

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| A 7th `per-axis` mention exists somewhere this plan's grep didn't cover (e.g. a file extension the grep pattern missed) | Low | Low | Task 3's Step 4 verification re-runs the grep after all edits land, not just once at planning time |
| Someone re-adds an aspirational device-control section to ADR-004 later without realizing it's a non-goal | Low | Low | The Correction Log entry states the non-goal reasoning inline (not just cited), so it survives even if `.omc/`/`.omx/` are never available to a future reader |
| The recommended per-axis-scaling follow-up bead never gets filed, and this plan's "surface, don't decide" approach becomes a silent no by default | Medium | Low | This plan's own seeding step (bd) creates that follow-up bead explicitly, so it isn't left as a prose recommendation only |

## Verification Steps

1. `grep -n "scale_mesh" docs/adr/006-workflow-orchestration.md:285 README.md:110` — matching phrasing, both uniform-only.
2. `grep -rn "per-axis" --include="*.md" docs/ docs-site/` — every remaining match is inside a Correction Log entry, not a live claim (run AFTER Task 3, not after Task 1 alone — v1's mistake was treating a Task-1-only grep as if it certified the whole plan).
3. `grep -n "Query device status\|Cancel print job" docs/adr/004-mcp-server-architecture.md` — no matches (Task 2).
4. `grep -c "Correction (2026-09-05)" docs/adr/004-mcp-server-architecture.md` — exactly 2 (one from Task 2, one from Task 3's `:207` fix).

## ADR

**Decision:** Fix every real `scale_mesh` "per-axis" claim found by a repo-wide grep (not just the one ADR-006 bullet the original audit flagged), and replace (not merely annotate-around) ADR-004's aspirational device-control list — applying one consistent "fix + dated Correction Log entry" rule to both kinds of correction.

**Drivers:** ADRs and docs should reflect decisions accurately; a stale claim left rendered live is a real risk (a future reader could implement per-axis scaling incorrectly, or live device control by mistake) that outweighs the historical-preservation value of leaving wrong text in place uncorrected; a committed document's citations should be self-contained rather than depending on gitignored local state.

**Alternatives considered:** implementing per-axis `scale_mesh` scaling instead of/alongside the docs fix (Option B) — not rejected outright; deliberately surfaced as a separate recommended follow-up bead rather than decided inside this plan, since the plan's own source audit rates it "High" severity with a ready implementation path, which is real evidence this plan is not positioned to unilaterally overrule.

**Why chosen:** "fix + log" is the one rule that resolves v1's self-contradiction (silent rewrite in one task, preserve-and-annotate in the other) and directly addresses the tradeoff an Architect review identified: a wrong claim left rendered live is a bigger, later, more expensive risk than the "historical archaeology" cost of relying on `git log -p` for anyone who wants the original wrong text.

**Consequences:** ADR-004 no longer shows its original (wrong) device-control scope draft on the live page — it is available via `git log -p`. Six independent, dated restatements of "per-axis" scaling across this repo's docs are corrected in one pass instead of leaving five of them stale after only fixing the first one found.

**Follow-ups:**
1. File "Implement per-axis `scale_mesh` scaling" as a separate feature bead (see Options section above) — a product decision for the user, not decided here.
2. File "Audit docs-site for tools that don't exist in src/" as a separate bead (`translate_mesh`, `rotate_mesh`, `boolean_mesh`, `export_mesh`).
3. A Critic review of this v2 revision is still recommended before implementation — the paired review was interrupted by a session boundary before it returned.

## Changelog

- v1: Initial draft (Planner). Fixed only `docs/adr/006-workflow-orchestration.md`'s one `scale_mesh` mention and annotated ADR-004's device-control list in place.
- v2 (this revision): Architect review (round 1) found v1's cited line number was off by one (285, not 284), that v1 fixed only 1 of 6 real `per-axis` mentions in the repo (missing `004:207`, `005:10`, `005:182`, and a published docs-site page with a worked JSON example that would fail against the real schema — the highest-blast-radius site of the six), that the ADR-004 annotation's sole citation (`.omx/specs/...`) is gitignored/untracked and unreachable to most readers, that the proposed replacement text's own "superseded" word count contradicted its own Verification Step 2, that the annotation's bullet list wasn't properly `>`-prefixed (would render outside the blockquote as live content, defeating the annotation), that Principle 1 was applied inconsistently across the two v1 tasks (silent rewrite vs. preserve-and-annotate for the same class of defect), and that the Options section gave Option A no stated cons while dismissing Option B with language ("ADR typo") that asserted the very conclusion in dispute, suppressing the source audit's own "High" severity rating. All fixed in this revision: corrected line number, a new Task 3 covering all 5 remaining sites (including the docs-site worked example), a uniform "fix + dated Correction Log entry" rule applied to every task, inline (not citation-only) non-goal reasoning, corrected blockquote formatting, a verification step written against the actual final text, a rebalanced Options section with real Option-A cons and Option-B evidence surfaced, and an explicit recommended follow-up bead for the per-axis-scaling feature decision instead of a silent no. A Critic review of this v2 is still recommended before implementation.
