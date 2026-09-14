# Lessons — Manual-only Vercel deploy for docs-site (2026-09-14)

## `git.deploymentEnabled` has no wildcard branch keys

- **What happened:** Set `"git": {"deploymentEnabled": {"*": false, "**": false, "main": false}}`
  expecting `"*"`/`"**"` to disable auto-deploy on all branches. Opening a
  PR from an unrelated branch still triggered an automatic (and failing)
  deployment.
- **Why:** Vercel's `deploymentEnabled` object form only matches literal
  branch names as keys. `"*"` and `"**"` are just branch names that don't
  exist — they match nothing. Any branch not explicitly listed defaults to
  enabled (`true`).
- **How to apply:** To disable git-triggered auto-deploy for every branch,
  use the boolean form — `"git": {"deploymentEnabled": false}"` — not a
  per-branch object with wildcard-looking keys.
- **Evidence:** `00e4dbf` (the fix); deployments `dpl_5LFmRgreDyYC9AbpaB41axjtJo9c`
  and `dpl_79nd51CEPq9tKg75nvjkddbw3jDq`, both auto-triggered on the PR
  branch despite the wildcard config.

## `vercel.json` is only read from the project's configured `rootDirectory`

- **What happened:** Even after fixing the boolean above, merging the PR to
  `main` still auto-deployed (and failed: `STATIC_BUILD_NO_OUT_DIR`).
- **Why:** The Vercel project's `rootDirectory` setting was unset (defaults
  to repo root). The git integration builds/reads config relative to that
  setting — it was never looking inside `docs-site/`, so `docs-site/vercel.json`
  (including the `deploymentEnabled` fix) was never read at all. No error
  surfaced anywhere pointing at this; the only symptom was "auto-deploy
  still happens" and a generic build-output error.
- **How to apply:** When an app lives in a subdirectory and its
  `vercel.json` isn't taking effect, check the Vercel project's
  `rootDirectory` setting (`GET /v9/projects/{id}`) before assuming the
  file's contents are wrong.
- **Evidence:** deployment `dpl_9adf85EWciWBv3MsLk2B9GxSbMpE`
  (`errorCode: STATIC_BUILD_NO_OUT_DIR`); fixed via
  `PATCH /v9/projects/{id}` with `{"rootDirectory": "docs-site"}`.

## A workflow's `working-directory` and the project's `rootDirectory` both apply — don't stack them

- **What happened:** After setting `rootDirectory: docs-site`, the manual
  `vercel-deploy` workflow (which already had `working-directory: docs-site`)
  started failing: `Error: The provided path ".../docs-site/docs-site" does
  not exist.`
- **Why:** The Vercel CLI appends the project's `rootDirectory` setting to
  whatever directory it's invoked from. The workflow was already `cd`'d
  into `docs-site`, so the CLI appended `docs-site` again.
- **How to apply:** When a Vercel project has `rootDirectory` set, invoke
  the CLI from the repo root (no `working-directory` override) and let the
  project setting do the pathing — don't also `cd` into the subdirectory
  first.
- **Evidence:** `30fcab7` (the fix); run `34780037084` failed before it,
  run `34780114698` succeeded after.

## Repo-level GitHub secrets always shadow org-level ones of the same name

- **What happened:** Org-wide `VERCEL_ACCESS_TOKEN`/`VERCEL_ORG_ID` secrets
  (visibility `ALL`) already existed, but this repo also had its own
  repo-level copies from an earlier session — meaning the workflow was
  silently using the stale repo copy, not the shared org secret. Same issue
  the user had previously hit on a separate project (`3d-sites`).
- **Why:** GitHub Actions resolves a repo-level secret before an org-level
  secret of the same name — there's no warning or indication that the
  org-level value is being shadowed.
- **How to apply:** When standardizing on an org-wide shared secret, delete
  the repo-level duplicate of the same name — don't just add the org-level
  one and assume it takes over.
- **Evidence:** `gh secret list --repo` before/after — repo previously
  showed `VERCEL_ACCESS_TOKEN`/`VERCEL_ORG_ID` (2026-09-08), removed via
  `gh secret delete`, leaving only `VERCEL_PROJECT_ID`.

---

Candidates to promote into long-term memory (if the project has a memory system):

- [ ] Before trusting a `vercel.json` setting to take effect for a
      subdirectory app, verify the Vercel project's `rootDirectory` matches
      — a mismatch fails silently with no config error, only a build-time
      symptom.
- [ ] Org-wide GitHub Actions secrets require deleting same-named
      repo-level duplicates to actually take effect.
