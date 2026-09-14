# Summary — Manual-only Vercel deploy for docs-site (2026-09-14)

## Goal

Stop `docs-site` auto-deploying to Vercel on every push; replace with a
manual `workflow_dispatch` action (`vercel-deploy`, production/preview
choice), confirm Vercel is Git-connected with Deployment Protection off,
and add a manual trigger to the binary release workflow too.

## What was done

### catesworks/bambu-cli-mcp

- Removed push-triggered `deploy-docs.yml`; added
  `.github/workflows/vercel-deploy.yml` — `workflow_dispatch` only, with a
  `production`/`preview` environment choice input (`383afd4`).
- Added `git.deploymentEnabled` to `docs-site/vercel.json` to disable
  Vercel's own auto-deploy-on-push. First attempt used a per-branch object
  with `"*"`/`"**"` wildcard keys, which don't exist in Vercel's schema —
  fixed to the boolean form `{"git": {"deploymentEnabled": false}}`
  (`383afd4`, corrected in `00e4dbf`).
- Added `workflow_dispatch` (with a `tag` input) to `.github/workflows/release.yml`
  so binary releases can be triggered manually, not just on tag push
  (`383afd4`).
- Fixed `vercel-deploy.yml`'s `working-directory: docs-site` conflicting
  with the Vercel project's `rootDirectory` setting (see below), which
  doubled the deploy path to `docs-site/docs-site` — `30fcab7`.
- Single web app in the repo (`docs-site`), so no app-picker input was
  added — the org convention (`type: string` comma-separated `apps` input
  resolved into a matrix) is documented but deliberately not built here;
  add it if a second app shows up.

### Vercel project `bambu-cli-mcp-docs` (via API, not in git history)

- `rootDirectory` was unset (defaulted to repo root) — set to `docs-site`
  via `PATCH /v9/projects/prj_sstde6Xo5Vc8QBfl4OYw3zA4vZba`. This is the
  actual reason `git.deploymentEnabled` was never taking effect: the git
  integration was reading (or failing to find) `vercel.json` at repo root,
  never at `docs-site/vercel.json`.
- Deleted repo-level GitHub secrets `VERCEL_ACCESS_TOKEN` and
  `VERCEL_ORG_ID` from `catesworks/bambu-cli-mcp` (kept the per-repo
  `VERCEL_PROJECT_ID`) so the org-wide `ALL`-visibility secrets of the same
  names — already present from separate work on `3d-sites` — actually take
  effect. A repo-level secret always shadows an org-level one of the same
  name in GitHub Actions.
- Confirmed, not changed: Deployment Protection was already off
  (`ssoProtection`/`passwordProtection` both `null`), and the project was
  already Git-connected to `catesworks/bambu-cli-mcp`
  (`link.type: github`).

## Verification

- `gh workflow run vercel-deploy -f environment=production` on branch
  `fix/vercel-deploy-cwd` succeeded (run `34780114698`) after the cwd fix —
  first attempt (run `34780037084`, before the fix) failed with
  `Error: The provided path "…/docs-site/docs-site" does not exist.`
- Resulting Vercel deployment `dpl_HaWKdGyEvDMXD1SKdwo5Urzb4ieZ`:
  `target: production`, `readyState: READY`.
- `curl -o /dev/null -w "%{http_code}"` against the deployment URL →
  `200`.
- Confirmed the auto-deploy fix holds: pushing/opening PR #2
  (`fix/vercel-deploy-cwd`) produced **no** new entry in the project's
  deployment list — before the fix, opening PR #1's branch had triggered
  two unwanted deployments (`dpl_5LFmRgreDyYC9AbpaB41axjtJo9c`,
  `dpl_79nd51CEPq9tKg75nvjkddbw3jDq`, both `ERROR`), and merging PR #1 to
  `main` still triggered one more (`dpl_9adf85EWciWBv3MsLk2B9GxSbMpE`,
  `ERROR`, `STATIC_BUILD_NO_OUT_DIR`) because `rootDirectory` was still
  unset at that point.
- Not verified: actual rendered page content of the docs site (only
  checked HTTP status, not that Docusaurus content is correct/complete).

## Commits

| SHA | Repo | Message | Pushed? |
|-----|------|---------|---------|
| `383afd4` | bambu-cli-mcp | fix(ci): manual-only Vercel deploy + workflow_dispatch on release | yes (PR #1, merged) |
| `00e4dbf` | bambu-cli-mcp | fix(ci): use boolean deploymentEnabled: false, not per-branch wildcards | yes (PR #1, merged) |
| `30fcab7` | bambu-cli-mcp | fix(ci): deploy from repo root, not docs-site, in vercel-deploy | yes (PR #2, merged) |

## Out of scope / deferred

- App-picker input for multiple web apps — repo only has one (`docs-site`).
- Extracting/documenting the `rootDirectory`-unset failure mode as an
  org-wide audit across other catesworks repos using the same manual-Vercel
  pattern — see `FOLLOWUPS.md`.
