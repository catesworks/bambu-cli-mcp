# Follow-ups — Manual-only Vercel deploy for docs-site (2026-09-14)

## Blocked on the user (decisions / approvals / access)

- None. Both PRs merged, change verified live.

## Blocked on work (do next)

- None outstanding for this task.

## Nice-to-have / later

- [ ] Audit other catesworks repos that follow the same manual-Vercel-deploy
      pattern (`cates-works`, `fw-chorus`, `3d-sites`, etc.) for the same
      `rootDirectory`-unset bug — a project can have `git.deploymentEnabled: false`
      in `vercel.json` and still auto-deploy if `rootDirectory` doesn't
      point at the app subfolder. Worth folding into the
      `catesworks-repo-standards` skill's `vercel` topic report as an
      explicit check (`GET /v9/projects/{id}` → `rootDirectory` field).
- [ ] If a second web app is ever added to `bambu-cli-mcp`, extend
      `vercel-deploy.yml` with the org's `apps` string-input + matrix
      pattern (see `references/vercel-deploy-pattern.md` in the
      `catesworks-repo-standards` skill) — deliberately not built now since
      there's only one app.

## Known risks / watch-outs

- The very first push/PR after re-enabling `deploymentEnabled: false` on a
  repo where `rootDirectory` is also being corrected in the same change can
  still fire one auto-deploy — Vercel decides based on the config as of
  that push, and there's a narrow window where an in-flight push predates
  the fix landing. Not observed this session, but worth expecting on
  future repos doing the same migration.
- The manual `vercel-deploy` workflow always deploys from `main`'s current
  state (repo root, no `working-directory`) — don't reintroduce a
  `working-directory: docs-site` override, or the `rootDirectory`-doubling
  bug from this session comes back.

## Done this session (for reference)

- [x] `workflow_dispatch`-only `vercel-deploy` workflow, production/preview
      choice (`383afd4`)
- [x] `workflow_dispatch` added to `release.yml` (`383afd4`)
- [x] `git.deploymentEnabled: false` fixed to the boolean form (`00e4dbf`)
- [x] Vercel project `rootDirectory` set to `docs-site` (Vercel API, no SHA)
- [x] `vercel-deploy.yml` cwd fix to stop doubling the deploy path (`30fcab7`)
- [x] Repo-level `VERCEL_ACCESS_TOKEN`/`VERCEL_ORG_ID` secrets deleted so
      the org-wide shared secrets take effect (`gh secret delete`, no SHA)
- [x] Confirmed Deployment Protection already off, Git connection already
      correct — no change needed
- [x] End-to-end verified: manual production deploy READY, HTTP 200,
      no unwanted auto-deploy on subsequent pushes
