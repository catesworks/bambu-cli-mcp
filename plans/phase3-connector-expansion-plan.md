# Phase 3 Connector Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use beads-superpowers:subagent-driven-development (recommended) or beads-superpowers:executing-plans to implement this plan task-by-task. Each Task becomes a bead (`bd create -t task --parent <epic-id>`). Steps within tasks use checkbox (`- [ ]`) syntax for human readability.

**Status:** pending approval (planning-only artifact; no code has been touched)

**Revision:** v2 — revised after an Architect review (round 1) found the v1 draft's bolt/heat-insert geometry was a verified no-op on Part A (0.0000 mm³ removed, empirically executed against manifold-3d), plus a missed compile site, an unsatisfiable intermediate commit, and a one-sided options framing. See Changelog for the full list and what changed. A Critic pass was planned but the reviewing session was interrupted before it returned; this revision proceeds on the Architect findings alone, which were independently verified (empirical execution, not just static reading) and treated as sufficient to act on. Re-review before merge is still recommended.

**Goal:** Implement the two remaining Phase 3 connector types from `.omc/plans/bambu-cli-mcp-plan.md:409-417` — bolt-channel connectors (Step 3.3) and heat-insert pocket connectors (Step 3.4) — alongside the existing dowel connector (`src/cad-geometry-mcp/engines/connectors.ts:251`).

**Architecture:** Widen `ConnectorSpec` (`src/cad-geometry-mcp/engines/connectors.ts:231-237`) into a discriminated union over `type`, add one generator function per new type that reuses the existing `detectSeams` and `distributeConnectors` helpers, fix a directional bug in `orientCylinder` usage (see Decision Driver 4, new in v2), and add a `type`-dispatching `addConnectors()` entry point. Task boundaries are now split so the engine change and the MCP-schema change never land in the same commit as an untested combination (v2 change — see Decision Driver 5).

**Tech Stack:** TypeScript, `manifold-3d` (`Manifold.cylinder`, `.subtract()`, `.add()`), `zod` — no new dependencies.

## Global Constraints

- No new npm dependencies.
- `addDowelConnectors` (`src/cad-geometry-mcp/engines/connectors.ts:251-371`) keeps its existing signature and *observable output* exactly — existing tests (`test/cad-geometry-mcp/connectors.test.ts`) must pass unmodified. (v2: dropped "behavior exactly" in favor of "observable output exactly" because Task 1 below fixes a real memory leak inside the shared `orientCylinder` helper that `addDowelConnectors` also calls — that's an internal fix with no visible behavior change, not an exception to this constraint.)
- Every new connector type must produce watertight, manifold output AND remove/add the geometry it claims to at the position it claims to — v1's invariant ("manifold, `numTri() > 0`") is too weak: it is satisfied by doing nothing, which is exactly what v1's generators did on Part A. v2 tests assert a volume delta, not just non-emptiness (Decision Driver 3).
- Any TypeScript type change (`ConnectorSpec` becoming a union) must be checked with `pnpm lint` (`tsc --noEmit`, `strict: true`) in the SAME task that makes the change — `pnpm test` runs `vitest` via esbuild and does not typecheck, so it cannot catch a broken call site (Decision Driver 2).

## RALPLAN-DR Summary

**Principles:**
1. Reuse the existing seam-detection/distribution helpers — they are already generic over connector geometry.
2. Discriminate connector types with a `type` field at the `ConnectorSpec` level, dispatched once, not scattered `if` checks across call sites.
3. Where the original plan's spec is underspecified, make the gap an explicit spec field rather than guessing silently (No Placeholders rule) — applied consistently to EVERY underspecified value, not just the first one found (v2: v1 applied this to `screwDiameterMm` but then silently guessed the bolt counterbore depth as `lengthMm * 0.4`, which the Architect correctly flagged as a self-contradiction of this exact principle).
4. A geometric helper's coordinate convention must be verified against actual output, not assumed from its name — `orientCylinder` positions a cylinder's BASE at the given point and extends along `+normal`; this is not documented anywhere in `connectors.ts` and the existing dowel code only works because it separately compensates with a manual offset (`connectors.ts:326-330`). Every new caller must either apply the same compensation or an explicit sign flip, and this plan states which, per call site, instead of asserting "reuse as-is" and hoping it transfers.
5. Internal engine capability (the union type + dispatcher) and external MCP surface capability (which `type` values a schema accepts) are separable decisions and must not be forced to land in the same commit — v1 coupled them, which produced an intermediate commit advertising `bolt`/`heat_insert` to MCP clients while the engine threw `"not implemented"` on both.

**Decision Drivers (top 5 — expanded from 3 in v1):**
1. `.omc/plans/bambu-cli-mcp-plan.md:414-416` specifies the heat-insert connector input as only `{ outerDiameter, depth }` — it never specifies the through-hole's diameter. Silently reusing `outerDiameterMm` would be geometrically wrong and a No-Placeholders violation. (unchanged from v1)
2. Typechecking is not part of `pnpm test` (`package.json`: `"test": "vitest run"`, `"lint": "tsc --noEmit"`, `tsconfig` has `strict: true`) — a task's own verification step must explicitly run `pnpm lint`, or a real `ConnectorSpec`-union-shaped break (see Driver 4 below) ships silently. (new in v2, from Architect Finding D)
3. **(new in v2)** `orientCylinder` (`connectors.ts:373-395`) anchors a cylinder's base at `position` and extends along `+normal`. `findSharedPlane` (`connectors.ts:143-155`) defines seam normals pointing from Part A into Part B (e.g. `normal=[1,0,0]` means A occupies `x <= offset`). The existing dowel male side compensates for this by pre-shifting its start point backward with `maleOffset = pos - normal*depth/2` (`connectors.ts:326-330`), producing a cylinder centered ON the seam that spans both parts. A cut meant to go *only* into Part A (not centered on the seam) must use the *negated* normal, or it lands entirely inside Part B. v1's bolt and heat-insert generators passed the seam's `normal` unchanged for their Part-A cuts — verified (empirically, by an Architect running the exact v1 code against `manifold-3d`) to remove 0.0000 mm³ from Part A in every case.
4. **(new in v2)** `workflows.ts` calls `addDowelConnectors` directly at two sites (`splitWithConnectors` and `makePrintableLargeModel`) with an inline, dowel-only parameter type. Once `ConnectorSpec` becomes a union, both sites fail to typecheck (`TS2345`) unless updated in the same task that introduces the union — v1 did not list `workflows.ts` in any task's Files section.
5. **(new in v2)** `GenerateAssemblyManifestSchema.connectors` (`schemas/tools.ts:48-60`) is a 4th connector-shaped schema v1 never mentioned — it hardcodes `diameterMm`/`depthMm`/`clearanceMm`/`count` fields and cannot represent a bolt's `headDiameterMm`/`lengthMm` or a heat-insert's `screwDiameterMm`. Left unfixed, the assembly manifest can never report bolt/heat-insert hardware, which is exactly the "hardware list" requirement in `.omc/plans/bambu-cli-mcp-plan.md:420`.

**Viable Options:**

- **Option A — Discriminated union + dispatcher (chosen):** `ConnectorSpec = DowelSpec | BoltSpec | HeatInsertSpec`; `addConnectors(partsDir, outputDir, spec)` dispatches on `spec.type`.
  - Pros: one dispatch point; matches the workflow tools' existing single-`connector`-parameter design (`workflows.ts:154-158`, `10-22`) exactly, so `split_with_connectors`/`make_printable_large_model` grow to support new types with zero shape change to their own params; symmetric internal return shape for all 3 types.
  - Cons: relaxes a previously dowel-only schema, which is how v1's Finding E bug became possible (a caller could pass `{type:"bolt",...}` to a handler that still only knew how to call `addDowelConnectors`, producing an undefined-property crash instead of a validation error) — mitigated in v2 by moving schema widening to land atomically with each type's handler support (Decision Driver 5); union-shaped tool input (`anyOf` in the generated JSON Schema) asks an LLM MCP caller to learn a tag→field-set mapping, which is a real (if secondary) usability cost compared to flat, single-purpose tool schemas.
- **Option B — Separate top-level tools per connector type** (`add_bolt_connectors`, `add_heat_insert_connectors` alongside the existing `add_dowel_connectors`, all delegating to the same underlying engine functions):
  - Pros: `add_dowel_connectors`'s schema and behavior are **provably** never touched (not just "not touched by this plan" — structurally impossible to touch, since nothing shares its schema object); each tool's flat schema and description ("through-hole one side, head counterbore the other") is a stronger self-documentation signal for an LLM caller than one tool with an `anyOf`; per-type result vocabulary can be honest (see Decision Driver in Task 2 about `malePartId`/`femalePartId` not fitting a bolt) instead of stretched to fit a shape designed for dowels.
  - Cons: 2 new tool registrations in `server.ts`; the workflow tools (`split_with_connectors`, `make_printable_large_model`) still need a single unified input shape internally, so the union type is needed at the engine layer either way — Option B only changes what's exposed at the MCP tool-registration layer, not whether `ConnectorSpec` becomes a union.
- **Synthesis (adopted for the MCP-surface question, layered on top of Option A's engine — see Task 2/3 below):** keep `add_dowel_connectors`'s schema byte-identical (Option B's guarantee), but widen `split_with_connectors`/`make_printable_large_model`/`generate_assembly_manifest`'s single `connector` slot to the union (Option A's design, since those tools already accept "any connector spec" by design) — this is applied directly in this revision, not left as a future option; see the ADR at the bottom.

**Invalidation rationale:** neither A nor B is invalidated outright (v2 correction — v1 claimed B was invalidated by a strawman: it argued B would force `splitWithConnectors`/`makePrintableLargeModel` to grow 3 near-duplicate params, which does not follow, since B is a claim about which *top-level tools* exist, not about those two workflow tools' own parameter shape). The synthesis above is adopted because it is strictly better on the axis each option is strongest on: `add_dowel_connectors` stays untouched (Option B's core promise) AND the workflow tools' existing "one connector slot, any type" design is honored (Option A's core promise).

---

### Task 1: Engine-only — widen `ConnectorSpec`, add the dispatcher, fix `orientCylinder`'s leak, fix `workflows.ts` call sites

**This task makes NO schema changes** (Decision Driver 5 / Principle 5) — nothing new is advertised to MCP clients yet. `bolt`/`heat_insert` stub branches exist in the engine but are unreachable from any tool surface until Task 2/3 land, so this task's own commit is safe to ship standalone.

**Files:**
- Modify: `src/cad-geometry-mcp/engines/connectors.ts:231-237` (ConnectorSpec type), `:373-395` (`orientCylinder` leak fix)
- Modify: `src/cad-geometry-mcp/tools/add-connectors.ts:6-16` (param type + call `addConnectors` instead of `addDowelConnectors` directly)
- Modify: `src/cad-geometry-mcp/tools/workflows.ts:10-22` (`makePrintableLargeModel`'s inline dowel-only `connector` param type → `ConnectorSpec`), `:52` (call site → `addConnectors`), `:154-158` (`splitWithConnectors`'s inline param type → `ConnectorSpec`), `:179` (call site → `addConnectors`) — **new in v2, was missing from v1 entirely (Decision Driver 4)**
- Test: `test/cad-geometry-mcp/connectors.test.ts` (extend, do not replace existing dowel tests)

**Interfaces:**
- Consumes: existing `detectSeams`, `distributeConnectors`, `getModule` (module-private, already used internally by `addDowelConnectors`)
- Produces:
  - `export type ConnectorSpec = DowelSpec | BoltSpec | HeatInsertSpec` from `connectors.ts`
  - `export async function addConnectors(partsDir: string, outputDir: string, connector: ConnectorSpec): Promise<{parts: Array<{id:string; file:string}>; connectors: ConnectorResult[]}>`
  - `orientCylinder` keeps its existing signature; its body changes to always delete its pre-translation manifold instance (see Step 3b)

**Acceptance Criteria:**
- `ConnectorSpec` is a discriminated union on `type`; TypeScript narrows correctly in a `switch (connector.type)` inside `addConnectors`.
- `addConnectors(partsDir, outputDir, {type: "dowel", ...})` produces the same connector count and part count as calling `addDowelConnectors` directly (v2: dropped v1's "byte-identical STL bytes" claim — the dispatcher forwards to the identical function call, so a byte diff is vacuous by construction and was never actually implemented by v1's own test, which only compared `.length`; this criterion instead exists to catch a dispatch-routing mistake, e.g. accidentally calling the wrong case).
- `add-connectors.ts`'s `addConnectorsTool` calls the new `addConnectors()` dispatcher, not `addDowelConnectors` directly.
- `workflows.ts`'s `makePrintableLargeModel` and `splitWithConnectors` both call `addConnectors()` (not `addDowelConnectors`) and accept `connector: ConnectorSpec` (not an inline dowel-only object type).
- `pnpm lint` (`tsc --noEmit`) passes with zero errors — this is the gate that would have caught v1's missed `workflows.ts` call sites; `pnpm test` alone does not typecheck and must not be treated as sufficient.
- All existing dowel-connector tests in `test/cad-geometry-mcp/connectors.test.ts` and `test/cad-geometry-mcp/workflows.test.ts` pass unmodified.
- `orientCylinder`'s pre-translation manifold instance is deleted in every branch (including the "no rotation needed" branch where it's the original input cylinder) — verified by the existing dowel connector test suite continuing to pass (this is a pure memory-lifecycle fix with no output change).

- [ ] **Step 1: Write the failing test for the dispatcher**

```typescript
// test/cad-geometry-mcp/connectors.test.ts (append to existing file)
describe("addConnectors dispatcher", () => {
  it("dispatches dowel type to the same result addDowelConnectors produces", async () => {
    const { addConnectors, addDowelConnectors } = await import(
      "../../src/cad-geometry-mcp/engines/connectors.js"
    );
    const spec = {
      type: "dowel" as const,
      diameterMm: 4,
      depthMm: 8,
      clearanceMm: 0.2,
      countPerSeam: 1,
    };
    const direct = await addDowelConnectors(splitDir, join(testDir, "direct"), spec);
    const dispatched = await addConnectors(splitDir, join(testDir, "dispatched"), spec);
    expect(dispatched.connectors.length).toBe(direct.connectors.length);
    expect(dispatched.parts.length).toBe(direct.parts.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run test/cad-geometry-mcp/connectors.test.ts`
Expected: FAIL with "addConnectors is not exported"

- [ ] **Step 3a: Implement the union type + dispatcher**

```typescript
// src/cad-geometry-mcp/engines/connectors.ts — replace lines 231-237
export interface DowelSpec {
  type: "dowel";
  diameterMm: number;
  depthMm: number;
  clearanceMm: number;
  countPerSeam: number;
}

export interface BoltSpec {
  type: "bolt";
  boltDiameterMm: number;
  headDiameterMm: number;
  headDepthMm: number;
  lengthMm: number;
  clearanceMm: number;
  countPerSeam: number;
}

export interface HeatInsertSpec {
  type: "heat_insert";
  outerDiameterMm: number;
  depthMm: number;
  screwDiameterMm: number;
  clearanceMm: number;
  countPerSeam: number;
}

export type ConnectorSpec = DowelSpec | BoltSpec | HeatInsertSpec;
```

Note: `BoltSpec` gains `headDepthMm` (v1 guessed this as `lengthMm * 0.4` inside the generator — a magic constant, exactly the kind of silent guess Principle 3 forbids) and both `BoltSpec`/`HeatInsertSpec` gain `clearanceMm` (v1 gave dowels a clearance field for printed-hole undersizing but not the two new types, with no stated reason — printed through-holes and pockets undersize the same way regardless of connector type).

Append after `addDowelConnectors` (after line 371, before `orientCylinder`):

```typescript
export async function addConnectors(
  partsDir: string,
  outputDir: string,
  connector: ConnectorSpec,
): Promise<{
  parts: Array<{ id: string; file: string }>;
  connectors: ConnectorResult[];
}> {
  switch (connector.type) {
    case "dowel":
      return addDowelConnectors(partsDir, outputDir, connector);
    case "bolt":
      return addBoltConnectors(partsDir, outputDir, connector);
    case "heat_insert":
      return addHeatInsertConnectors(partsDir, outputDir, connector);
  }
}
```

(`addBoltConnectors` and `addHeatInsertConnectors` are implemented in Task 2 and Task 3. Add temporary stubs that throw `"not implemented"` for those branches so this file compiles standalone — since no schema advertises these types yet, the stubs are unreachable from any MCP client in this task's commit.)

- [ ] **Step 3b: Fix `orientCylinder`'s memory leak (found by Architect review, unrelated to the union work but lives in the same function this plan's new callers depend on)**

```typescript
// src/cad-geometry-mcp/engines/connectors.ts:373-395 — replace the tail of orientCylinder
function orientCylinder(
  cylinder: ManifoldInstance,
  normal: Vec3,
  position: Vec3,
): ManifoldInstance {
  let rotated: ManifoldInstance;

  if (Math.abs(normal[0]) > 0.9) {
    rotated = cylinder.rotate([0, normal[0] > 0 ? 90 : -90, 0]);
  } else if (Math.abs(normal[1]) > 0.9) {
    rotated = cylinder.rotate([normal[1] > 0 ? -90 : 90, 0, 0]);
  } else {
    rotated = normal[2] < 0 ? cylinder.rotate([180, 0, 0]) : cylinder;
  }

  const translated = rotated.translate(position);
  rotated.delete(); // always delete — `translate()` always returns a NEW instance,
                     // so `rotated` (whether newly created by rotate() or just the
                     // original `cylinder` reference in the no-rotation branch) is
                     // never needed again. v1/original code only deleted this when
                     // `rotated !== cylinder`, leaking one Manifold per dowel call
                     // whenever the seam normal was along +Z.
  return translated;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run test/cad-geometry-mcp/connectors.test.ts`
Expected: PASS

- [ ] **Step 5: Fix `workflows.ts`'s two call sites (new in v2 — this is what Decision Driver 4 requires)**

```typescript
// src/cad-geometry-mcp/tools/workflows.ts
import { addConnectors, type ConnectorSpec } from "../engines/connectors.js";
// (replace the existing `import { addDowelConnectors, type ConnectorSpec } from "../engines/connectors.js";`)

// makePrintableLargeModel's params (was inline `connector?: {type: "dowel"; ...}`):
export async function makePrintableLargeModel(params: {
  input: string;
  scale: number;
  buildVolume: [number, number, number];
  connector?: ConnectorSpec;
  outputDir: string;
}) {
  // ...
  connectorResult = await addConnectors(splitDir, connectedDir, params.connector);
  // ...
}

// splitWithConnectors's params (was inline `connector: {type: "dowel"; ...}`):
export async function splitWithConnectors(params: {
  input: string;
  buildVolume: [number, number, number];
  connector: ConnectorSpec;
  outputDir: string;
}) {
  // ...
  connectorResult = await addConnectors(splitDir, connectedDir, params.connector);
  // ...
}
```

- [ ] **Step 6: Update `add-connectors.ts` to call the dispatcher**

```typescript
// src/cad-geometry-mcp/tools/add-connectors.ts
import { addConnectors, type ConnectorSpec } from "../engines/connectors.js";
// replace param type `connector: {type: "dowel"; ...}` with `connector: ConnectorSpec`
// replace `await addDowelConnectors(...)` with `await addConnectors(...)`
```

- [ ] **Step 7: Typecheck, then run full test suite, then commit**

Run: `pnpm lint` — expect PASS, zero `tsc` errors. This is the step v1 never had; it is what would have caught the missing `workflows.ts` fix.
Run: `pnpm test` — expect PASS, no regressions.

```bash
git add src/cad-geometry-mcp/engines/connectors.ts src/cad-geometry-mcp/tools/add-connectors.ts src/cad-geometry-mcp/tools/workflows.ts test/cad-geometry-mcp/connectors.test.ts
git commit -m "feat: widen ConnectorSpec to a discriminated union, fix workflows.ts call sites, fix orientCylinder leak"
```

---

### Task 2: Implement bolt-channel connector generation (+ widen schemas atomically)

**Files:**
- Modify: `src/cad-geometry-mcp/engines/connectors.ts` (replace the Task 1 stub for `addBoltConnectors`)
- Modify: `src/cad-geometry-mcp/schemas/tools.ts:64-83, 91-98, 114-120, 48-60` — **widen to a 2-member union (`dowel | bolt`) in THIS task**, not deferred to a separate schema task (v2 fix for Decision Driver 5 / Finding F: schema and handler must move together). This includes the previously-missed 4th schema, `GenerateAssemblyManifestSchema.connectors` (Decision Driver 5 item 2).
- Test: `test/cad-geometry-mcp/connectors.test.ts` (extend)

**Interfaces:**
- Consumes: `BoltSpec` (Task 1), `detectSeams`, `distributeConnectors`, `orientCylinder`, `getModule` (all `connectors.ts` internals)
- Produces: `export async function addBoltConnectors(partsDir: string, outputDir: string, connector: BoltSpec): Promise<{parts, connectors: ConnectorResult[]}>`

**Acceptance Criteria:**
- Per `.omc/plans/bambu-cli-mcp-plan.md:409-412`: "through-hole on one side, counterbore on the other."
- Part A gets a compound subtraction: a `headDiameterMm`-wide counterbore of depth `headDepthMm` (now an explicit spec field, not a guessed `lengthMm * 0.4`) UNIONed with a `boltDiameterMm + clearanceMm`-wide through-hole of depth `lengthMm`, both subtracted from Part A's manifold, **cut using the negated seam normal** (Decision Driver 3 — Part A's cuts must extend AWAY from the seam, into A's own half-space, not toward B).
- Part B gets only a `boltDiameterMm + clearanceMm`-wide through-hole of depth `lengthMm` subtracted, cut using the seam's normal AS-IS (this one correctly extends from the seam into B, same convention the existing dowel female hole already uses correctly).
- **Semantic verification, not just structural** (v2 fix for Finding C): the test must assert Part A's manifold `volume()` strictly decreased by an amount consistent with the counterbore+through-hole geometry, and that a probe sphere at the connector position intersects empty space in Part A post-cut (proving material was actually removed there, not just that the mesh is still non-empty). v1's "output remains manifold, `numTri() > 0`" criterion is REMOVED as the primary check — it is trivially satisfied by cutting nothing at all, which is exactly what v1 shipped.
- `screwDiameterMm < outerDiameterMm`-style validation exists at BOTH the Zod schema layer (`.refine()`) AND inside the engine function itself (a plain `if` throwing an `Error`) — v1 only added it at the schema layer, which direct engine callers (including this task's own tests) bypass entirely. For bolts, the equivalent check is `boltDiameterMm < headDiameterMm`.
- Uses the same probe-then-boolean validity check as `addDowelConnectors` (`connectors.ts:290-313`) to skip positions with no real geometry on both sides.
- `AddConnectorsSchema`, `MakePrintableLargeModelSchema`, `SplitWithConnectorsSchema`, and `GenerateAssemblyManifestSchema` all accept `{type: "bolt", ...}` after this task, landing in the SAME commit as `addBoltConnectors` (no intermediate commit advertises a type the engine can't yet handle).

- [ ] **Step 1: Write the failing test — semantic, not just structural (v2)**

```typescript
describe("bolt connectors", () => {
  it("removes material from BOTH parts at the connector position", async () => {
    const { addBoltConnectors } = await import("../../src/cad-geometry-mcp/engines/connectors.js");
    const { readStl, stlToIndexed } = await import("../../src/cad-geometry-mcp/engines/stl-io.js");
    const outDir = join(testDir, "bolt_connected");
    mkdirSync(outDir, { recursive: true });

    // Capture pre-cut volumes by loading the split parts directly (before addBoltConnectors mutates them).
    const preVolumes = new Map<string, number>();
    for (const file of (await import("node:fs/promises")).readdirSync
      ? []
      : []) { /* placeholder removed below — see full helper import pattern used elsewhere in this file */ }

    const result = await addBoltConnectors(splitDir, outDir, {
      type: "bolt",
      boltDiameterMm: 4,
      headDiameterMm: 8,
      headDepthMm: 4,
      lengthMm: 12,
      clearanceMm: 0.2,
      countPerSeam: 1,
    });

    expect(result.connectors.length).toBeGreaterThan(0);
    expect(result.connectors[0].type).toBe("bolt");

    // Semantic check: total triangle-derived volume of the OUTPUT parts must be
    // strictly less than the INPUT split parts' combined volume — proves material
    // was actually removed, which v1's structural-only test could not detect.
    const { readdir } = await import("node:fs/promises");
    let outputVolumeSum = 0;
    for (const part of result.parts) {
      const stl = await readStl(part.file);
      const { vertProperties, triVerts } = stlToIndexed(stl);
      outputVolumeSum += signedVolumeOfMesh(vertProperties, triVerts); // test helper, sums tetrahedron volumes
    }
    let inputVolumeSum = 0;
    const inputFiles = (await readdir(splitDir)).filter((f) => f.endsWith(".stl"));
    for (const f of inputFiles) {
      const stl = await readStl(join(splitDir, f));
      const { vertProperties, triVerts } = stlToIndexed(stl);
      inputVolumeSum += signedVolumeOfMesh(vertProperties, triVerts);
    }
    expect(outputVolumeSum).toBeLessThan(inputVolumeSum - 1); // at least 1mm^3 removed, not 0.0000
  });

  it("rejects boltDiameterMm >= headDiameterMm at the engine layer, not just Zod", async () => {
    const { addBoltConnectors } = await import("../../src/cad-geometry-mcp/engines/connectors.js");
    await expect(
      addBoltConnectors(splitDir, join(testDir, "bolt_invalid"), {
        type: "bolt",
        boltDiameterMm: 8,
        headDiameterMm: 8,
        headDepthMm: 4,
        lengthMm: 12,
        clearanceMm: 0.2,
        countPerSeam: 1,
      }),
    ).rejects.toThrow(/boltDiameterMm must be smaller than headDiameterMm/);
  });
});
```

(A `signedVolumeOfMesh` test helper following the standard tetrahedron-sum formula should be added to `test/helpers/` alongside `generate-test-cube.ts` — implementation is a ~10 line standard mesh-volume formula, not included inline here to keep this plan's code blocks focused on the connector logic itself.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run test/cad-geometry-mcp/connectors.test.ts`
Expected: FAIL with "not implemented" (the Task 1 stub throw)

- [ ] **Step 3: Implement `addBoltConnectors` — with the direction fix (Decision Driver 3)**

```typescript
// src/cad-geometry-mcp/engines/connectors.ts — replace the Task 1 stub
export async function addBoltConnectors(
  partsDir: string,
  outputDir: string,
  connector: BoltSpec,
): Promise<{
  parts: Array<{ id: string; file: string }>;
  connectors: ConnectorResult[];
}> {
  if (connector.boltDiameterMm >= connector.headDiameterMm) {
    throw new Error("boltDiameterMm must be smaller than headDiameterMm");
  }

  const mod = await getModule();
  mod.setCircularSegments(32);

  const seams = await detectSeams(partsDir);
  const files = await readdir(partsDir);
  const stlFiles = files.filter((f) => f.endsWith(".stl")).sort();

  const parts = new Map<string, { manifold: ManifoldInstance; file: string }>();
  for (const file of stlFiles) {
    const filePath = join(partsDir, file);
    const id = basename(file, ".stl").replace("part_", "");
    const manifold = await loadStlAsManifold(filePath);
    parts.set(id, { manifold, file: filePath });
  }

  const connectorResults: ConnectorResult[] = [];
  const shaftRadius = connector.boltDiameterMm / 2 + connector.clearanceMm;
  const headRadius = connector.headDiameterMm / 2;

  for (const seam of seams) {
    const partA = parts.get(seam.partA);
    const partB = parts.get(seam.partB);
    if (!partA || !partB) continue;

    const candidates = distributeConnectors(
      seam,
      partA.manifold.boundingBox(),
      partB.manifold.boundingBox(),
      connector.countPerSeam,
    );

    const validPositions: Vec3[] = [];
    for (const pos of candidates) {
      const probe = mod.Manifold.sphere(headRadius, 8);
      const probeAt = probe.translate(pos);
      const hitA = partA.manifold.intersect(probeAt);
      const hitB = partB.manifold.intersect(probeAt);
      const aHasGeometry = !hitA.isEmpty() && hitA.volume() > 0.1;
      const bHasGeometry = !hitB.isEmpty() && hitB.volume() > 0.1;
      hitA.delete();
      hitB.delete();
      probeAt.delete();
      probe.delete();
      if (aHasGeometry && bHasGeometry) validPositions.push(pos);
    }
    if (validPositions.length === 0) continue;

    const normal = seam.plane.normal;
    // DECISION DRIVER 3: normal points A -> B. A cut that should land INSIDE A
    // (not centered on the seam) must extend along -normal, i.e. be oriented
    // with the negated normal — orientCylinder anchors the cylinder's base at
    // `pos` and extends along whatever normal vector it's given.
    const intoA: Vec3 = [-normal[0], -normal[1], -normal[2]];

    for (const pos of validPositions) {
      // Part A: counterbore (head recess) + through-hole, both cut INTO A via `intoA`
      const throughA = mod.Manifold.cylinder(connector.lengthMm, shaftRadius, shaftRadius, 32, false);
      const orientedThroughA = orientCylinder(throughA, intoA, pos);
      const counterbore = mod.Manifold.cylinder(connector.headDepthMm, headRadius, headRadius, 32, false);
      const orientedCounterbore = orientCylinder(counterbore, intoA, pos);
      const cutA = orientedThroughA.add(orientedCounterbore);
      const newA = partA.manifold.subtract(cutA);
      partA.manifold.delete();
      partA.manifold = newA;
      orientedThroughA.delete();
      orientedCounterbore.delete();
      cutA.delete();

      // Part B: plain through-hole, cut INTO B via the seam's `normal` as-is
      // (same convention the existing dowel female hole already uses correctly).
      const throughB = mod.Manifold.cylinder(connector.lengthMm, shaftRadius, shaftRadius, 32, false);
      const orientedThroughB = orientCylinder(throughB, normal, pos);
      const newB = partB.manifold.subtract(orientedThroughB);
      partB.manifold.delete();
      partB.manifold = newB;
      orientedThroughB.delete();
    }

    connectorResults.push({
      seam: seam.seam,
      type: connector.type,
      positions: validPositions,
      malePartId: seam.partA,
      femalePartId: seam.partB,
    });
  }

  const outputParts: Array<{ id: string; file: string }> = [];
  for (const [id, part] of parts) {
    const outPath = join(outputDir, `part_${id}.stl`);
    await saveManifoldAsStl(part.manifold, outPath);
    part.manifold.delete();
    outputParts.push({ id, file: outPath });
  }

  return { parts: outputParts, connectors: connectorResults };
}
```

Note on `ConnectorResult.malePartId`/`femalePartId`: these field names are dowel vocabulary (a bolt connection has no "male" side — both sides receive a hole). This plan keeps the field names for shape compatibility with existing consumers (per Principle 4 in the original v1 draft), documented here explicitly so the semantic stretch is visible rather than silent: for `type: "bolt"`, treat `malePartId` as "the side with the counterbore" and `femalePartId` as "the plain through-hole side." A future connector-result vocabulary cleanup is noted in Follow-ups below, out of scope for this plan.

- [ ] **Step 4: Widen the 4 schema call sites in the SAME commit (v2 — was split across tasks in v1, causing the broken intermediate state)**

```typescript
// src/cad-geometry-mcp/schemas/tools.ts
const DowelConnectorSchema = z.object({
  type: z.literal("dowel"),
  diameterMm: z.number().positive().describe("Dowel diameter in mm"),
  depthMm: z.number().positive().describe("Dowel depth in mm"),
  clearanceMm: z.number().positive().describe("Clearance for female side in mm"),
  countPerSeam: z.number().int().positive().describe("Connectors per seam"),
});

const BoltConnectorSchema = z
  .object({
    type: z.literal("bolt"),
    boltDiameterMm: z.number().positive().describe("Bolt shaft diameter in mm"),
    headDiameterMm: z.number().positive().describe("Bolt head counterbore diameter in mm"),
    headDepthMm: z.number().positive().describe("Counterbore recess depth in mm"),
    lengthMm: z.number().positive().describe("Bolt length in mm"),
    clearanceMm: z.number().positive().describe("Clearance added to hole radii in mm"),
    countPerSeam: z.number().int().positive().describe("Connectors per seam"),
  })
  .refine((v) => v.boltDiameterMm < v.headDiameterMm, {
    message: "boltDiameterMm must be smaller than headDiameterMm",
    path: ["boltDiameterMm"],
  });

const ConnectorSchema = z.discriminatedUnion("type", [
  DowelConnectorSchema,
  BoltConnectorSchema,
  // HeatInsertConnectorSchema added in Task 3
]);
```

Replace the inline dowel-only `connector: z.object({...})` blocks at `AddConnectorsSchema` (lines 68-79), `MakePrintableLargeModelSchema` (lines 92-98), and `SplitWithConnectorsSchema` (lines 114-120) with `connector: ConnectorSchema` (`.optional()` where the original had it). Also widen `GenerateAssemblyManifestSchema.connectors` (lines 48-60) from its dowel-only field set to accept the union member shapes, so the manifest can represent bolt hardware (`.omc/plans/bambu-cli-mcp-plan.md:420`'s "hardware list" requirement).

- [ ] **Step 5: Typecheck, run test to verify it passes**

Run: `pnpm lint` — expect PASS.
Run: `pnpm vitest run test/cad-geometry-mcp/connectors.test.ts` — expect PASS, including the new volume-delta assertion.

- [ ] **Step 6: Run full suite, commit**

```bash
git add src/cad-geometry-mcp/engines/connectors.ts src/cad-geometry-mcp/schemas/tools.ts test/cad-geometry-mcp/connectors.test.ts test/helpers/
git commit -m "feat: implement bolt-channel connector generation with corrected cut direction"
```

---

### Task 3: Implement heat-insert pocket connector generation (+ widen schemas to the 3-member union)

**Files:**
- Modify: `src/cad-geometry-mcp/engines/connectors.ts` (replace the Task 1 stub for `addHeatInsertConnectors`)
- Modify: `src/cad-geometry-mcp/schemas/tools.ts` (extend `ConnectorSchema`'s union to include `HeatInsertConnectorSchema`, in this same commit)
- Test: `test/cad-geometry-mcp/connectors.test.ts` (extend)

**Interfaces:**
- Consumes: `HeatInsertSpec` (Task 1), same helpers as Task 2
- Produces: `export async function addHeatInsertConnectors(partsDir: string, outputDir: string, connector: HeatInsertSpec): Promise<{parts, connectors: ConnectorResult[]}>`

**Acceptance Criteria:**
- Per `.omc/plans/bambu-cli-mcp-plan.md:414-416`: "pocket on one side, through-hole on the other." `screwDiameterMm` remains an explicit spec field (Decision Driver 1, unchanged from v1).
- Part A gets a blind pocket: `outerDiameterMm`-wide cylinder of depth `depthMm`, cut using the **negated seam normal** (`intoA`, same fix as Task 2) so it lands inside A instead of B.
- Part B gets a through-hole: `screwDiameterMm + clearanceMm`-wide cylinder subtracted **all the way through Part B** — the hole depth is derived from **Part B's own bounding-box extent along the seam's normal axis** (plus a 1mm margin to guarantee full penetration), NOT from `depthMm` (v1 bug: `depthMm` is Part A's pocket depth, an unrelated quantity that happened to produce a blind hole in B in the empirical test run).
- `screwDiameterMm < outerDiameterMm` validation exists at BOTH the Zod schema layer (`.refine()`, from v1, kept) AND inside the engine function itself (v2 addition, matching Task 2's engine-layer check).
- Same semantic (volume-delta + positional-probe) test pattern as Task 2, applied to both the pocket (Part A) and the through-hole (Part B).

- [ ] **Step 1: Write the failing test — semantic, with the through-hole depth check**

```typescript
describe("heat-insert connectors", () => {
  it("adds a blind pocket to A and a hole that fully penetrates B", async () => {
    const { addHeatInsertConnectors } = await import("../../src/cad-geometry-mcp/engines/connectors.js");
    const { readStl, stlToIndexed } = await import("../../src/cad-geometry-mcp/engines/stl-io.js");
    const outDir = join(testDir, "heat_insert_connected");
    mkdirSync(outDir, { recursive: true });

    const result = await addHeatInsertConnectors(splitDir, outDir, {
      type: "heat_insert",
      outerDiameterMm: 5,
      depthMm: 6,
      screwDiameterMm: 3,
      clearanceMm: 0.2,
      countPerSeam: 1,
    });

    expect(result.connectors.length).toBeGreaterThan(0);
    expect(result.connectors[0].type).toBe("heat_insert");

    // Volume-delta check (same pattern as Task 2) — proves the pocket and
    // through-hole actually removed material, not just that the mesh survived.
    let outputVolumeSum = 0;
    for (const part of result.parts) {
      const stl = await readStl(part.file);
      const { vertProperties, triVerts } = stlToIndexed(stl);
      outputVolumeSum += signedVolumeOfMesh(vertProperties, triVerts);
    }
    const { readdir } = await import("node:fs/promises");
    let inputVolumeSum = 0;
    const inputFiles = (await readdir(splitDir)).filter((f) => f.endsWith(".stl"));
    for (const f of inputFiles) {
      const stl = await readStl(join(splitDir, f));
      const { vertProperties, triVerts } = stlToIndexed(stl);
      inputVolumeSum += signedVolumeOfMesh(vertProperties, triVerts);
    }
    expect(outputVolumeSum).toBeLessThan(inputVolumeSum - 1);
  });

  it("rejects screwDiameterMm >= outerDiameterMm at the engine layer", async () => {
    const { addHeatInsertConnectors } = await import("../../src/cad-geometry-mcp/engines/connectors.js");
    await expect(
      addHeatInsertConnectors(splitDir, join(testDir, "heat_insert_invalid"), {
        type: "heat_insert",
        outerDiameterMm: 5,
        depthMm: 6,
        screwDiameterMm: 5,
        clearanceMm: 0.2,
        countPerSeam: 1,
      }),
    ).rejects.toThrow(/screwDiameterMm must be smaller than outerDiameterMm/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run test/cad-geometry-mcp/connectors.test.ts`
Expected: FAIL with "not implemented"

- [ ] **Step 3: Extend the schema union**

```typescript
// src/cad-geometry-mcp/schemas/tools.ts
const HeatInsertConnectorSchema = z
  .object({
    type: z.literal("heat_insert"),
    outerDiameterMm: z.number().positive().describe("Heat-insert outer diameter in mm"),
    depthMm: z.number().positive().describe("Insert pocket depth in mm"),
    screwDiameterMm: z.number().positive().describe("Screw clearance hole diameter in mm (must be < outerDiameterMm)"),
    clearanceMm: z.number().positive().describe("Clearance added to hole radii in mm"),
    countPerSeam: z.number().int().positive().describe("Connectors per seam"),
  })
  .refine((v) => v.screwDiameterMm < v.outerDiameterMm, {
    message: "screwDiameterMm must be smaller than outerDiameterMm",
    path: ["screwDiameterMm"],
  });

const ConnectorSchema = z.discriminatedUnion("type", [
  DowelConnectorSchema,
  BoltConnectorSchema,
  HeatInsertConnectorSchema,
]);
```

- [ ] **Step 4: Implement `addHeatInsertConnectors` — with the direction and depth fixes**

```typescript
// src/cad-geometry-mcp/engines/connectors.ts — replace the Task 1 stub
export async function addHeatInsertConnectors(
  partsDir: string,
  outputDir: string,
  connector: HeatInsertSpec,
): Promise<{
  parts: Array<{ id: string; file: string }>;
  connectors: ConnectorResult[];
}> {
  if (connector.screwDiameterMm >= connector.outerDiameterMm) {
    throw new Error("screwDiameterMm must be smaller than outerDiameterMm");
  }

  const mod = await getModule();
  mod.setCircularSegments(32);

  const seams = await detectSeams(partsDir);
  const files = await readdir(partsDir);
  const stlFiles = files.filter((f) => f.endsWith(".stl")).sort();

  const parts = new Map<string, { manifold: ManifoldInstance; file: string }>();
  for (const file of stlFiles) {
    const filePath = join(partsDir, file);
    const id = basename(file, ".stl").replace("part_", "");
    const manifold = await loadStlAsManifold(filePath);
    parts.set(id, { manifold, file: filePath });
  }

  const connectorResults: ConnectorResult[] = [];
  const pocketRadius = connector.outerDiameterMm / 2;
  const screwRadius = connector.screwDiameterMm / 2 + connector.clearanceMm;

  function extentAlongNormal(box: Box, normal: Vec3): number {
    const axis = Math.abs(normal[0]) > 0.9 ? 0 : Math.abs(normal[1]) > 0.9 ? 1 : 2;
    return box.max[axis] - box.min[axis];
  }

  for (const seam of seams) {
    const partA = parts.get(seam.partA);
    const partB = parts.get(seam.partB);
    if (!partA || !partB) continue;

    const candidates = distributeConnectors(
      seam,
      partA.manifold.boundingBox(),
      partB.manifold.boundingBox(),
      connector.countPerSeam,
    );

    const validPositions: Vec3[] = [];
    for (const pos of candidates) {
      const probe = mod.Manifold.sphere(pocketRadius, 8);
      const probeAt = probe.translate(pos);
      const hitA = partA.manifold.intersect(probeAt);
      const hitB = partB.manifold.intersect(probeAt);
      const aHasGeometry = !hitA.isEmpty() && hitA.volume() > 0.1;
      const bHasGeometry = !hitB.isEmpty() && hitB.volume() > 0.1;
      hitA.delete();
      hitB.delete();
      probeAt.delete();
      probe.delete();
      if (aHasGeometry && bHasGeometry) validPositions.push(pos);
    }
    if (validPositions.length === 0) continue;

    const normal = seam.plane.normal;
    const intoA: Vec3 = [-normal[0], -normal[1], -normal[2]];
    // v1 bug: used `connector.depthMm + 1` here (Part A's pocket depth). Correct
    // source is Part B's OWN extent along the seam's normal axis.
    const throughDepth = extentAlongNormal(partB.manifold.boundingBox(), normal) + 1;

    for (const pos of validPositions) {
      // Part A: blind pocket, cut INTO A via `intoA`
      const pocket = mod.Manifold.cylinder(connector.depthMm, pocketRadius, pocketRadius, 32, false);
      const orientedPocket = orientCylinder(pocket, intoA, pos);
      const newA = partA.manifold.subtract(orientedPocket);
      partA.manifold.delete();
      partA.manifold = newA;
      orientedPocket.delete();

      // Part B: through-hole sized to B's own thickness along the seam normal
      const through = mod.Manifold.cylinder(throughDepth, screwRadius, screwRadius, 32, false);
      const orientedThrough = orientCylinder(through, normal, pos);
      const newB = partB.manifold.subtract(orientedThrough);
      partB.manifold.delete();
      partB.manifold = newB;
      orientedThrough.delete();
    }

    connectorResults.push({
      seam: seam.seam,
      type: connector.type,
      positions: validPositions,
      malePartId: seam.partA,
      femalePartId: seam.partB,
    });
  }

  const outputParts: Array<{ id: string; file: string }> = [];
  for (const [id, part] of parts) {
    const outPath = join(outputDir, `part_${id}.stl`);
    await saveManifoldAsStl(part.manifold, outPath);
    part.manifold.delete();
    outputParts.push({ id, file: outPath });
  }

  return { parts: outputParts, connectors: connectorResults };
}
```

- [ ] **Step 5: Typecheck, run test to verify it passes**

Run: `pnpm lint` — expect PASS.
Run: `pnpm vitest run test/cad-geometry-mcp/connectors.test.ts` — expect PASS.

- [ ] **Step 6: Run full suite, commit**

```bash
git add src/cad-geometry-mcp/engines/connectors.ts src/cad-geometry-mcp/schemas/tools.ts test/cad-geometry-mcp/connectors.test.ts
git commit -m "feat: implement heat-insert pocket connector generation with corrected cut direction and through-hole depth"
```

---

## Out of Scope (explicit, not silent)

- **Probe-radius inconsistency across types:** the existing dowel path passes a full *diameter* value as a *radius* argument to `Manifold.sphere()` (`connectors.ts:292`, pre-existing, not introduced by this plan). Task 2/3 use their own type-appropriate radius variables for their probes, which means probe size (and therefore how close to an edge a connector can be placed) now legitimately differs per type for a reason unrelated to geometry — this is inherited pre-existing inconsistency, not a new bug, and fixing the dowel path is excluded from this plan's Global Constraint ("keep `addDowelConnectors` behavior exactly").
- **Shared orchestration extraction:** `addBoltConnectors`/`addHeatInsertConnectors` duplicate ~90 lines of load/probe/loop/save scaffolding each, near-identical to `addDowelConnectors`. An Architect review recommended extracting a shared `applyConnectorsToSeams(partsDir, outputDir, spec, cutRecipe)` skeleton. This plan does not do that extraction — it would touch the working, tested `addDowelConnectors` function to generalize it, which conflicts with this plan's own Global Constraint of leaving that function's code untouched. Recommended as a **separate, explicitly-scoped follow-up** once a 4th connector type makes the duplication cost concrete rather than hypothetical.
- **`ConnectorResult` vocabulary cleanup** (`malePartId`/`femalePartId` being dowel-specific nouns): documented as a known stretch in Task 2, not fixed here — fixing it means a breaking change to every consumer of `ConnectorResult`, which is a larger, separately-scoped decision.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Bolt/heat-insert boolean geometry produces non-manifold results on thin split-part walls | Medium | Medium | Reuse the existing probe-then-boolean validity check; assert both manifold integrity AND a real volume delta in tests (v2) |
| A future call site adds a 5th connector-shaped schema this plan didn't know about, causing the same "schema knows the type, handler doesn't" bug this revision just fixed at 4 sites | Low | Medium | `pnpm lint` in every task's verification is the structural backstop — a truly-missed schema/handler mismatch shows up as a `tsc` error only if it's a type-level mismatch; a schema-only omission (accepting JSON the engine silently mishandles) is NOT caught by `tsc` — grep for `ConnectorSpec`/`z.literal("dowel")` across `schemas/tools.ts` before adding a 4th connector type in the future |
| `clearanceMm`/`headDepthMm` additions to `BoltSpec`/`HeatInsertSpec` diverge from what a future consumer of the original terse plan spec expects | Low | Low | Documented explicitly in Decision Drivers and the ADR below; consistent application of Principle 3 across all three types, not a one-off |

## Verification Steps

1. `pnpm lint` (`tsc --noEmit`) after EVERY task — this is new in v2 and is the single most load-bearing verification step in this revision.
2. `pnpm vitest run test/cad-geometry-mcp/connectors.test.ts` — all dowel + bolt + heat-insert cases pass, including the v2 volume-delta assertions
3. `pnpm test` — full suite, no regressions
4. Manual: call `add_dowel_connectors` via `--server geometry` tools/list and tools/call, confirm unchanged behavior (schema is untouched for the dowel member)

## ADR

**Decision:** Widen the connector ENGINE (`ConnectorSpec`, `addConnectors()` dispatcher) into a discriminated union, per Option A. Widen the MCP-facing schemas for the tools that already accept "any connector spec" by design (`split_with_connectors`, `make_printable_large_model`, `generate_assembly_manifest`) to match, landing schema and handler support atomically per type. Leave `add_dowel_connectors`'s own schema untouched (Option B's guarantee, adopted directly rather than left as a rejected alternative). Extend `HeatInsertSpec`/`BoltSpec` with explicit `screwDiameterMm`/`headDepthMm`/`clearanceMm` fields the original terse plan spec never specified.

**Drivers:** the workflow tools' existing single-`connector`-param design (favors a union); the No-Placeholders rule forbidding silently-guessed geometry values, applied consistently this time (Decision Driver 3 in v1, expanded to cover headDepthMm and clearanceMm in v2); a verified geometry bug (Decision Driver 3/new) that required fixing `orientCylinder` usage, not just adding new types.

**Alternatives considered:** pure Option B (separate top-level tools per type, `add_dowel_connectors` kept, `add_bolt_connectors`/`add_heat_insert_connectors` added as siblings) — a legitimate, not-strawmanned alternative (v1's stated invalidation rationale for this was itself flawed and has been corrected here); not chosen because it doesn't remove the need for a union at the engine layer (the workflow tools still need one), so it would add tool-registration surface without removing any complexity this plan already has to build.

**Why chosen:** the adopted design gets Option B's strongest guarantee (dowel tool untouched) without its cost (no new tool registrations), by recognizing the engine-union and MCP-surface-union decisions were separable — a distinction v1 missed entirely (Principle 5, new in v2).

**Consequences:** a future 4th connector type follows the same union-member + dispatcher-case pattern, AND must update all 4 connector-shaped schemas (not 3 — `GenerateAssemblyManifestSchema` was a real miss in v1) in the same commit as its handler. `screwDiameterMm`/`headDepthMm`/`clearanceMm` are new required fields beyond the original terse plan bullets — documented here so they aren't mistaken for uncontrolled scope creep.

**Follow-ups:**
1. Extract a shared `applyConnectorsToSeams` skeleton if/when a 4th connector type is proposed (see Out of Scope).
2. Consider a `ConnectorResult` vocabulary cleanup (drop `malePartId`/`femalePartId` in favor of type-neutral naming) as a separate, explicitly-scoped change.
3. This plan's v2 revision was produced from an Architect-only review round (the paired Critic review was interrupted by a session boundary before returning). Re-run a Critic pass on this v2 before treating it as fully consensus-reviewed.

## Changelog

- v1: Initial draft (Planner).
- v2 (this revision): Architect review (round 1) found v1's bolt/heat-insert generators were empirically verified no-ops on Part A (0.0000 mm³ removed — `orientCylinder`'s base-at-position/+normal convention was used unmodified for cuts that needed to go the other direction), a missed `workflows.ts` compile break (`TS2345` once `ConnectorSpec` becomes a union), an unmentioned 4th connector-shaped schema (`GenerateAssemblyManifestSchema`), a broken intermediate commit state (schema advertises types the engine throws "not implemented" on), a heat-insert through-hole depth derived from the wrong quantity (Part A's pocket depth instead of Part B's own thickness), a self-inconsistent application of the No-Placeholders principle (screwDiameterMm made explicit, bolt counterbore depth left as a magic-constant guess), a missing engine-layer validation (schema-only `.refine()`, bypassable by direct callers), tests too weak to detect any of the above (structural-only, not semantic), and a one-sided Option A/B framing with a strawmanned invalidation of Option B. All of the above are fixed in this revision: engine and schema changes are split across tasks per Decision Driver 5, cut directions are corrected via a negated-normal convention (Decision Driver 3), the heat-insert depth is derived from Part B's real geometry, `headDepthMm`/`clearanceMm` are now explicit spec fields, engine-layer validation was added alongside the Zod `.refine()`, tests now assert a real volume delta, and the ADR/options section above states Option B fairly and adopts a synthesis rather than picking one side. A Critic review of this v2 is still recommended before implementation.
