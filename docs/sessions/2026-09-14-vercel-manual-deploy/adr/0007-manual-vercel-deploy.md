# ADR 0007: Manual-only Vercel deployment via `workflow_dispatch`

- **Status:** accepted
- **Date:** 2026-09-14
- **Deciders:** repo owner (via chat request), implemented by session agent

## Context

`docs-site` was deploying to Vercel automatically on every push to `main`
via a push-triggered `deploy-docs.yml` GitHub Actions workflow. The owner
wanted deploys to be manual, wanted the Vercel project confirmed
Git-connected with Deployment Protection off, wanted a preview-deploy
option, and wanted the underlying credentials sourced from the org-wide
shared secret already used elsewhere (`3d-sites`) rather than duplicated
per-repo.

## Options considered

1. **Keep push-triggered auto-deploy, just gate it with a path filter.**
   Already in place before this session. Cons: burns Vercel build minutes
   on every docs push, no explicit human gate before a deploy goes live.
2. **`workflow_dispatch`-only GitHub Actions workflow + `vercel.json`
   `git.deploymentEnabled: false`.** Matches the org's existing pattern
   (`cates-works`, `fw-chorus`, `3d-sites`). Requires both the workflow
   change and the Vercel-side config to actually stop the git integration
   from also auto-deploying.
3. **Disconnect Vercel's GitHub integration entirely, deploy only via
   CLI/API token.** Simpler mental model, but loses PR-preview /
   commit-status integration some workflows rely on; not what the org
   pattern does elsewhere.

## Decision

Option 2. **Because** it matches the already-established org convention
(documented in the `catesworks-repo-standards` skill's `vercel` topic) and
keeps the Vercel project Git-connected (PR checks, etc.) while removing
automatic deploys — the workflow gates *when*, `deploymentEnabled: false`
gates *that git pushes never do it themselves*.

## Consequences

- **Positive:** Deploys are always a deliberate `workflow_dispatch` action
  with an explicit `production`/`preview` choice; no more Vercel build
  minutes spent on every docs push; credentials come from one org-wide
  source instead of being duplicated per repo.
- **Negative / cost:** Anyone wanting a docs update live must remember to
  run the workflow — no more "merge and forget." Reproducing this pattern
  in another repo requires getting `rootDirectory` right on the Vercel
  side too (see `LESSONS.md`) — it's not just a `vercel.json` change.
- **Follow-on:** Other catesworks repos using the same manual-deploy
  pattern may have the same `rootDirectory`-unset gap silently defeating
  their `deploymentEnabled: false` — worth an audit (see `FOLLOWUPS.md`).

## Notes

- Implements the `vercel` topic conformance target described in the
  `catesworks-repo-standards` skill (`references/vercel-deploy-pattern.md`).
- Code: `.github/workflows/vercel-deploy.yml`, `docs-site/vercel.json`
  (`383afd4`, `00e4dbf`, `30fcab7`).
- Vercel-side config (not in git): project `rootDirectory: docs-site`,
  org-wide `VERCEL_ACCESS_TOKEN`/`VERCEL_ORG_ID` secrets.
