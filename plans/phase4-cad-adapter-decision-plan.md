# Phase 4 CAD Adapter Expansion — Decision Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use beads-superpowers:executing-plans for Task 1 (decision capture). Tasks 2-5 carry a narrower, revised Scope Cut (v2) — see below.

**Status:** pending approval (planning-only artifact; no code or ADR has been written yet)

**Revision:** v2 — revised after an Architect review (round 1) found 6 concrete defects (wrong ADR directory, the decision bead itself never gets closed in any branch, an unsatisfiable Verification Step, engine-selection logic that partly already exists and was mis-cited, wrong line ranges, and untracked-file ADR citations), a one-sided Option A/B/C framing that omits a real 4th option, and a steelman worth answering directly: that this repo already shipped uninstalled-tool code (`cad-subprocess.ts`'s FreeCAD/Blender detection) in apparent tension with this plan's own Scope Cut principle. A paired Critic review was planned but the session was interrupted before it returned; this revision proceeds on the Architect findings alone (independently verified against `bd show`, `git ls-files`, and the actual source), with a note to re-review before merge. See Changelog for the full list.

**Goal:** Get an explicit go/no-go decision from the project owner on Phase 4 (FreeCAD/Fusion/Blender CAD engine adapters, `.omc/plans/bambu-cli-mcp-plan.md:432-455`) before any adapter code is written, since none of the three external tools are installed locally and the project's own gap analysis (`.omx/plans/bambu-cad-mcp-gap-analysis.md:28-29, 67, 120-129, 148`) explicitly treats them as future candidates, not current commitments.

**Architecture:** This plan does not modify source code. Task 1 produces an ADR **at `docs/adr/007-phase-4-cad-adapter-scope.md`** (v2 fix — was incorrectly scoped to a separate `docs/decisions/` directory in v1, which does not exist and contradicts this repo's actual `docs/adr/NNN-slug.md` convention) and, on a "proceed" answer, unblocks the relevant bd task beads for their own future writing-plans passes. **In every branch (A/B/C/D), the decision bead `bambu-cli-mcp-czr` itself is closed** (v2 fix — v1 left it open with zero dependents in every branch, a P2 zombie).

**Tech Stack:** N/A (decision + docs only for Task 1).

## Global Constraints

- No FreeCAD, Blender, or Fusion 360 code is written by this plan.
- This plan does not itself ask the user the go/no-go question — Task 1 documents the decision options and criteria; the actual `AskUserQuestion` gate happens when this plan is executed.
- **(v2)** The ADR this plan produces must be self-contained: `.omc/` and `.omx/` are both gitignored (`git ls-files .omc .omx` returns 0 tracked files for either), so any evidence this plan's ADR relies on must be quoted inline, not cited by path alone.
- **(v2)** Every claim about the current bd dependency graph or existing source code in this plan is verified against the live `bd show`/`bd dep tree` output and the actual file, not reconstructed from `.omc/plans/bambu-cli-mcp-plan.md`'s narrative — v1's D2/D3/D4/D5 defects (below) all trace back to reasoning from the narrative doc instead of the ground truth.

## Scope Cut (v2: narrowed from v1 — the adapter CONTRACT can be specified now; only the per-tool PYTHON PAYLOAD is deferred)

**v1's Scope Cut deferred all of Tasks 2-5 to acceptance-criteria-only detail.** An Architect review's steelman argument was persuasive enough to partially accept: this repo's own `cad-subprocess.ts:36-112` already ships `which freecad`/`FreeCADCmd --version` detection code for tools that are NOT installed — i.e., this project already writes code against uninstalled external tools when the code in question (subprocess invocation, path detection, version parsing) has no third-party API surface to get wrong. That is a real, existing precedent this plan's v1 Principle 1 didn't acknowledge.

**v2's revised position:** the adapter's TypeScript-side CONTRACT — function signature, temp-file lifecycle, timeout/error mapping, and `CadEngineInfo`/`list_available_engines` integration — has ZERO third-party API surface and is fully verifiable today against `cad-subprocess.ts`'s existing patterns, same as the detection code already shipped. Tasks 2-4 below specify this contract now. What remains genuinely deferred is narrower and more honest: the exact Python (or Fusion scripting) PAYLOAD string each adapter sends — e.g. which FreeCAD `Part`/`Mesh` module calls to invoke — which this plan does not write because it hasn't been checked against a running copy of FreeCAD/Blender/Fusion, and because doing so risks the No-Placeholders violation the original Scope Cut was right to worry about, just applied too broadly to code that didn't need it.

Fusion 360 remains fully deferred even at the contract level (see Task 3) — unlike FreeCAD/Blender, Fusion has no headless/CLI/container invocation path at all, so even its subprocess-bridge shape is genuinely unverifiable without the GUI-hosted scripting environment.

## RALPLAN-DR Summary

**Principles:**
1. **(v2, narrowed)** Don't write the per-tool PYTHON PAYLOAD for tools that aren't installed and verified. Do specify the TypeScript-side contract now where it has no third-party API surface — this repo already does exactly that in `cad-subprocess.ts`'s detection code, so a blanket "don't write any adapter code" principle was inconsistent with the project's own precedent.
2. A go/no-go decision on a 3-tool, cross-language expansion is a genuine architectural fork — it belongs to the user, not an autonomous default.
3. Keep the already-seeded blocked beads (`4di`, `6bk`, `1oa`, `p74`) correctly gated rather than closing them prematurely — a "no" decision closes them explicitly with a reason, not silently. **(v2 addition):** the decision bead `czr` itself is ALSO closed in every branch, not left open indefinitely.
4. **(v2, new)** A decision gate that can only be resolved in a live human turn needs a forcing function (an expiry, review date, or trigger condition) — an open-ended blocker with no expiry is easy to never resolve, which is a real risk this plan must not underrate.

**Decision Drivers (top 5 — expanded from 3 in v1):**
1. Zero of the three target tools are installed on this machine (`.omc/plans/bambu-cli-mcp-plan.md:21-33` Environment Facts table) — every adapter's PAYLOAD is blocked on a real install; the CONTRACT (Scope Cut, v2) is not.
2. The project's own gap analysis (`.omx/plans/bambu-cad-mcp-gap-analysis.md:148`) recommends gating adapter adoption behind dedicated tests — even the project's own prior analysis treats this as gated, not default.
3. `manifold-3d` already covers booleans/transforms/splitting for the common case; Phase 4 adapters exist for parametric/heavy operations manifold-3d can't do (precise STEP/IGES import, timeline-based parametric modeling).
4. **(v2, new)** `src/cad-geometry-mcp/engines/cad-subprocess.ts:124-140` (`selectEngine(preferred?)`) **already implements** the `fusion > freecad > blender > manifold` priority ordering WITH an explicit override parameter, and `src/cad-geometry-mcp/tools/workflows.ts:225-235` (`listAvailableEngines`) already returns a `recommended` field. v1's Task 5 presented this as entirely future work and never cited `selectEngine` — it exists today and already does most of what v1 described as deferred.
5. **(v2, new)** This plan's decision bead `bambu-cli-mcp-czr` has exactly 3 `BLOCKS` edges today (`4di`, `6bk`, `1oa` — verified via `bd show bambu-cli-mcp-czr`), not 4; `p74` (engine-selection) is blocked BY those three adapters, not directly by `czr`. v1's plan text and its own Verification Step both asserted 4 edges.

**Viable Options (v2: added Option D, rebalanced framing):**

- **Option A — Full Phase 4 (all 3 adapters + engine selection):** Build FreeCAD, Fusion 360, and Blender adapters plus the remaining engine-selection work (which, per Decision Driver 4, is now known to be smaller than v1 described — `selectEngine`'s priority logic already exists; what's left is wiring `inspect_mesh`'s own return shape to surface `recommendedEngines`, per Task 5 below).
  - Pros: matches the original plan's full ambition; supports STEP/IGES import and precise parametric ops manifold-3d can't do; this repo's own precedent (`cad-subprocess.ts`) shows uninstalled-tool groundwork is a normal, already-accepted pattern here, not a special risk unique to this option.
  - Cons: 3x Python-subprocess-bridge surface area, each needing its own installed tool + test environment eventually; Fusion 360 has no CLI at all (heaviest lift, requires GUI-hosted scripting API, and per the narrowed Scope Cut above, even its CONTRACT can't be specified without that environment); highest maintenance burden of any Phase in the original plan.
- **Option B — Blender-only fallback:** Build only the Blender adapter, skip FreeCAD and Fusion entirely.
  - Pros: Blender is free, scriptable headlessly (including in CI containers), and was already framed as "fallback for when FreeCAD/Fusion unavailable" — the option needing the least other infrastructure.
  - Cons: loses FreeCAD's precise STEP/IGES import and Fusion's timeline-based parametric modeling — if those specific capabilities are ever needed, this option doesn't provide them; the manifold-3d-is-usually-enough argument (Decision Driver 3) applies to Option A too, so it isn't a reason unique to preferring B — stated here so it isn't double-counted as evidence against A.
- **Option C — No Phase 4 (close as won't-do):** Rely on `manifold-3d` alone; close `4di`/`6bk`/`1oa`/`p74`/`czr` as `wontfix` with a documented reason.
  - Pros: zero added maintenance surface; matches current actual usage — nothing in this repo's tests or workflows currently calls out to FreeCAD/Blender/Fusion for real operations (`cad-subprocess.ts` only *detects* them).
  - Cons: forecloses precise parametric/STEP-IGES workflows unless revisited later; like Option A/B, "revisit later" has no built-in trigger in this plan unless Option D (below) is chosen alongside it.
- **Option D — Defer with an explicit trigger condition (v2, new — was missing from v1 entirely):** Don't decide A/B/C now; instead set `czr` and its 3 dependents to bd `deferred` status with a stated review trigger (e.g. "revisit when a user request involves a STEP/IGES file, or when `manifold-3d` boolean failures on a real job become a recurring complaint") and a review date, so the beads leave the active ready queue but are guaranteed to resurface rather than sitting open-ended.
  - Pros: directly answers Decision Driver 4/Principle 4's liveness concern — a decision gate resolvable only in a live human turn otherwise risks being skipped indefinitely by autonomous sessions that see it, can't act, and move on; costs nothing until the trigger fires.
  - Cons: is not itself a final answer — some future session still has to make the A/B/C call when the trigger fires; adds one more bd status/mechanism (`deferred` + review date) to track correctly.

**Invalidation rationale:** none of the four options is invalidated outright — this is a genuine, unresolved trade-off requiring the user's own priorities. v1's version of this section presented only 3 options and, per Architect review, tipped its own framing toward B/C via editorializing placed inside the "neutral" Decision Drivers and Principles sections (both corrected in this v2 revision) and asymmetric con-weighting; v2's Option A/B/C text above is written with matched pro/con depth, and Option D is added because the plan's own evidence (an unresolvable-in-one-turn gate, no expiry) supports it as a real candidate, not just A/B/C.

---

### Task 1: Capture the Phase 4 go/no-go decision

**Files:**
- Create: `docs/adr/007-phase-4-cad-adapter-scope.md` (v2 fix — matches this repo's actual convention: `docs/adr/001-pnpm-monorepo.md` through `docs/adr/006-workflow-orchestration.md`, `NNN-slug.md` naming. v1 incorrectly targeted a `docs/decisions/ADR-NNNN-...md` path that doesn't match any existing directory in this repo.)

**Interfaces:** N/A (decision record, not code)

**Acceptance Criteria:**
- ADR documents all 4 options (A/B/C/D above) with matched-depth pros/cons, exactly as in the RALPLAN-DR summary.
- ADR records the user's chosen option, with the date and reasoning, QUOTED INLINE — this ADR must not rely solely on citing `.omc/`/`.omx/` paths, which are gitignored and unreachable to a reader without this machine's local untracked state (v2 fix for Decision Driver / Architect Finding D6).
- **In EVERY branch, `bambu-cli-mcp-czr` (the decision bead itself) is closed** with a reason referencing the ADR (v2 fix — v1 never closed this bead in any branch, leaving a permanent P2 zombie at the head of `bd ready`):
  - **Option A:** `czr` closed as "resolved: proceed with full Phase 4, see docs/adr/007". Beads `4di`, `6bk`, `1oa`, `p74` stay open/blocked, each gets its `czr` blocking dependency removed (`bd dep remove`) so they become ready for their own future writing-plans pass once each tool is installed.
  - **Option B:** `czr` closed as "resolved: Blender-only fallback, see docs/adr/007". Beads `-6bk` (Fusion) and `-4di` (FreeCAD) are closed with reason "scope decision: Blender-only fallback chosen, see docs/adr/007"; bead `-1oa` (Blender) has its `czr` blocker removed; bead `-p74` is updated to drop Fusion/FreeCAD priority ordering and re-scoped to Blender-vs-manifold only.
  - **Option C:** `czr` closed as "resolved: Phase 4 declined, see docs/adr/007". All 4 dependent beads (`-4di`, `-6bk`, `-1oa`, `-p74`) are closed with the same reason.
  - **Option D:** `czr` closed as "resolved: deferred with trigger, see docs/adr/007". All 4 dependent beads are set to bd `deferred` status (not closed) with the stated trigger condition and a review date recorded in each bead's notes.

- [ ] **Step 1: Present the decision to the user**

Use the structured question tool (`AskUserQuestion` in Claude Code, or the equivalent for the executing harness) with the 4 options above, each carrying its matched-depth pros/cons summary. This step requires a live conversation turn — it cannot be resolved by an autonomous agent.

- [ ] **Step 2: Write the ADR**

Follow the existing ADR format in `docs/adr/006-workflow-orchestration.md` (Context / Decision / Rationale / Consequences sections). Fill in Decision and Rationale from the user's Step 1 answer. Quote the chosen option's reasoning inline rather than citing `.omc/plans/bambu-cli-mcp-plan.md` or `.omx/plans/bambu-cad-mcp-gap-analysis.md` as sole justification — both are gitignored.

- [ ] **Step 3: Reconcile the decision bead AND its dependents per the acceptance criteria above**

```bash
# Example for Option A (proceed with all 3 adapters):
bd close bambu-cli-mcp-czr --reason "resolved: proceed with full Phase 4, see docs/adr/007-phase-4-cad-adapter-scope.md"
bd dep remove bambu-cli-mcp-4di bambu-cli-mcp-czr
bd dep remove bambu-cli-mcp-6bk bambu-cli-mcp-czr
bd dep remove bambu-cli-mcp-1oa bambu-cli-mcp-czr
# p74 stays blocked on 4di/6bk/1oa (adapters must land before engine-selection logic) —
# this is a dependency on those 3 beads directly, NOT on czr (verified via `bd show bambu-cli-mcp-czr`:
# czr has exactly 3 BLOCKS edges — 4di, 6bk, 1oa — not 4; p74 is blocked transitively via those three).
```

- [ ] **Step 4: Commit**

```bash
git add docs/adr/007-phase-4-cad-adapter-scope.md
git commit -m "docs: record Phase 4 CAD adapter scope decision (ADR-007)"
```

---

### Task 2: FreeCAD adapter — contract now, Python payload deferred (v2: narrowed scope)

**Files:**
- Create: `src/cad-geometry-mcp/adapters/freecad-adapter.ts` — **v2: the function signature, temp-file lifecycle, timeout/error mapping, and `CadEngineInfo` integration CAN be specified now** (zero third-party API surface, verifiable against `cad-subprocess.ts`'s existing patterns today); the Python payload string(s) sent to FreeCAD's `Part`/`Mesh` modules remain deferred until FreeCAD is installed and that API is verified directly.

**Acceptance Criteria (stable regardless of future payload design):**
- Only proceeds if Task 1's decision is Option A.
- Prerequisite for the PAYLOAD portion only: FreeCAD CLI or AppImage installed and its path resolvable — detection already exists via `detectEngine("freecad")`/`detectAllEngines()` (`src/cad-geometry-mcp/engines/cad-subprocess.ts:36`, `:113` — v2 fix: v1 cited this as `:36-140`, which conflates `detectEngine` at `:36` with `detectAllEngines` at `:113`; the two are separate exported functions).
- The CONTRACT portion (function signature, subprocess timeout matching `runBambuStudio`'s 5-minute pattern, temp-file cleanup) is specified in a follow-up writing-plans pass that does NOT need FreeCAD installed — this can happen before or independent of the install.
- Must integrate with `listAvailableEngines()`'s existing `recommended` field (`src/cad-geometry-mcp/tools/workflows.ts:225-235`) without breaking its current manifold-only fallback behavior.
- The Python payload itself is written and tested only once FreeCAD is installed locally and its `Part`/`Mesh` API is verified directly (not guessed from documentation) — this part remains genuinely deferred per the narrowed Scope Cut.

---

### Task 3: Fusion 360 adapter (fully deferred — no headless/CLI path exists, unlike Task 2/4)

**Files:** Create `src/cad-geometry-mcp/adapters/fusion-adapter.ts` (exact API surface TBD — fully deferred, including the contract-level shape)

**Acceptance Criteria (stable regardless of future design):**
- Only proceeds if Task 1's decision is Option A.
- **Unlike Task 2/4, even the CONTRACT-level design is deferred here** — Fusion 360 has no CLI or headless invocation mode at all (`.omc/plans/bambu-cli-mcp-plan.md:441-444`); its scripting API only runs inside a running, GUI-hosted Fusion 360 instance, so there is no `execa`-subprocess shape to specify by analogy with `runBambuStudio`/`cad-subprocess.ts` the way Task 2/4's contracts can be. This is the one case where the original v1 Scope Cut's "can't verify without an install" reasoning applies without qualification.
- Same `listAvailableEngines()` integration requirement as Task 2, once a design exists.
- Full breakdown (contract AND payload) deferred to its own writing-plans pass once Fusion 360 + scripting is confirmed available.

---

### Task 4: Blender adapter — contract now, Python payload deferred (v2: narrowed scope)

**Files:** Create `src/cad-geometry-mcp/adapters/blender-adapter.ts` — same v2 narrowing as Task 2: contract now, `bpy`/`bmesh` payload deferred.

**Acceptance Criteria (stable regardless of future payload design):**
- Proceeds if Task 1's decision is Option A OR Option B.
- Prerequisite for the PAYLOAD portion only: Blender CLI installed, callable headlessly via `blender --background --python script.py` (`.omc/plans/bambu-cli-mcp-plan.md:450`) — this also runs in standard CI containers, so "not installed locally" is a provisioning choice for this adapter specifically, not an inherent verification blocker, unlike Task 3's Fusion case.
- Same `listAvailableEngines()` integration requirement as Task 2.
- Contract-level design (signature, temp-file lifecycle, timeout/error mapping) can proceed now, same reasoning as Task 2. The `bpy`/`bmesh` payload itself is deferred until Blender is installed and its per-release-versioned API is verified directly.

---

### Task 5: Engine-selection logic — re-scoped around what already exists (v2: was overscoped in v1)

**Files:** Modify `src/cad-geometry-mcp/engines/manifold-engine.ts`'s `inspectMesh()` return shape to add `recommendedEngines` (v2 fix — v1 named `src/cad-geometry-mcp/tools/inspect-mesh.ts`, which is a 12-line passthrough to `inspectMesh()` in `manifold-engine.ts`; the return shape actually originates in the latter file). Modify relevant tool schemas to accept an optional `engine` override parameter, threading it through to the ALREADY-EXISTING `selectEngine(preferred?)` (`src/cad-geometry-mcp/engines/cad-subprocess.ts:124-140`).

**Acceptance Criteria (stable regardless of remaining design):**
- **(v2, corrected scope)** `selectEngine(preferred?: CadEngine)` and its `fusion > freecad > blender > manifold` priority ordering with override support ALREADY EXIST (`cad-subprocess.ts:124-140`), as does `listAvailableEngines()`'s `recommended` field (`workflows.ts:225-235`). This task is NOT "build engine selection from scratch" as v1 described it — it is "surface `selectEngine`'s recommendation through `inspect_mesh`'s own return shape and thread an `engine` override parameter through to whichever tool call needs it," a narrower remaining task than v1 scoped.
- Blocked on Tasks 2/4 landing first for whichever subset Task 1's decision selects (Task 3/Fusion only if Option A) — `bd dep` chain reflects this: `4di`/`6bk`/`1oa` each block `p74` directly (verified: `czr` itself has no edge to `p74`, only to the 3 adapter beads — see Decision Driver 5).
- Priority order re-scopes to whatever subset Task 1 actually approves (e.g. if Option B, `selectEngine`'s existing ordering logic needs its priority list narrowed to Blender > manifold only — a small edit to an existing function, not new logic).
- Full breakdown deferred until Tasks 2/4's actual payloads exist to select between — but the SHAPE of this task (wire existing `selectEngine` into `inspect_mesh`'s output) is already known and doesn't need to wait for FreeCAD/Blender to be installed.

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Decision never gets made, beads sit blocked indefinitely | **Medium (v2: raised from v1's "Low")** | Medium (v2: raised from v1's "Low" — an Architect review correctly noted the real decay mode is DRIFT, not neglect: all 4 dependent beads pin context to a live, actively-edited planning doc's line ranges, which rot silently even if the beads are never "forgotten") | **(v2)** Option D exists specifically to give this risk a resolution path other than "the live-conversation gate eventually fires" — a deferred-with-trigger bead resurfaces on its own schedule instead of sitting open-ended |
| Writing detailed Tasks 2-5 now (against undocumented/unverified APIs) produces plausible-but-wrong code | Medium (v2: lowered from v1's "High" — the narrowed Scope Cut only defers the genuinely unverifiable PAYLOAD portion, not the whole task) | High if attempted for the payload; Low for the contract portion, which has no third-party surface to get wrong | Narrowed Scope Cut above — payload deferred until each tool is actually installed and verifiable; contract specified now against `cad-subprocess.ts`'s existing, already-shipped pattern |
| A future reader treats this ADR's citations of `.omc/`/`.omx/` paths as sufficient without realizing those are gitignored | Medium | Low | Task 1 Step 2 requires quoting reasoning inline, not citing only |

## Verification Steps

1. `bd show bambu-cli-mcp-czr` — **(v2 fix)** confirms exactly 3 `BLOCKS` edges (`4di`, `6bk`, `1oa`) before Task 1 executes, not 4 as v1 claimed; `p74` is blocked transitively via those three, not directly by `czr`.
2. After Task 1 executes: `bd show bambu-cli-mcp-czr` shows it CLOSED (in every branch — v2 fix, this didn't exist as a check in v1).
3. `bd ready` reflects the reconciled dependency state per whichever option was chosen, with no lingering P2 zombie at the head of the queue.

## ADR

See Task 1 — the ADR itself (`docs/adr/007-phase-4-cad-adapter-scope.md`) is this plan's primary code-free deliverable. This plan's own decision framing (above) intentionally provides matched-depth Option A/B/C/D text so that whichever the user picks, the ADR has real content to draw from rather than a one-sided setup.

## Changelog

- v1: Initial draft (Planner). Scope Cut deferred all of Tasks 2-5 to acceptance-criteria-only detail; 3 options (A/B/C) presented; ADR targeted `docs/decisions/`.
- v2 (this revision): Architect review (round 1) found 6 concrete defects — (D1) `docs/decisions/` doesn't match this repo's actual `docs/adr/NNN-slug.md` convention, retargeted to `docs/adr/007-...`; (D2) the decision bead `czr` was never closed in any of v1's three branches, now closed in all four; (D3) v1's own Verification Step asserted `czr` blocks 4 beads when `bd show` reports 3, corrected; (D4/D5) Task 5 presented `selectEngine`'s priority-ordering logic as entirely future work when it already exists at `cad-subprocess.ts:124-140`, and cited the wrong file (`inspect-mesh.ts` instead of `manifold-engine.ts`) for the return-shape change, both corrected; (D6) the ADR's evidence citations relied solely on gitignored `.omc/`/`.omx/` paths, now required to be quoted inline. Also addressed: an Architect steelman that this repo's own `cad-subprocess.ts` detection code already writes uninstalled-tool code, which the v1 Scope Cut's blanket principle didn't acknowledge — v2 narrows the Scope Cut to defer only the genuinely unverifiable per-tool Python payload, not the TypeScript-side contract, for FreeCAD/Blender (Fusion remains fully deferred, since it has no headless path at all); a tradeoff-tension finding that the decision gate's liveness risk was underrated (raised from Low to Medium impact/likelihood); and a framing-fairness finding that the original 3-option set omitted a real "defer with trigger" option and editorialized against Option A inside supposedly neutral sections — both fixed by adding Option D and rebalancing the Principles/Decision Drivers text. A Critic review of this v2 is still recommended before implementation.
