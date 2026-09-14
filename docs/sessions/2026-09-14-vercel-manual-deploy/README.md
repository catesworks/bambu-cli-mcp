# Session: Manual-only Vercel deploy for docs-site — 2026-09-14

> Resume pointer + index for this session's dossier. Read this first.

## State in one paragraph

Done and verified. `docs-site`'s Vercel deploy is now manual-only
(`workflow_dispatch` via a `vercel-deploy` action), the release binary
workflow gained a manual trigger too, and two real production bugs found
while verifying the change are fixed and confirmed live: Vercel's
`git.deploymentEnabled` doesn't support wildcard branch keys, and the
Vercel project's `rootDirectory` was never set, so `vercel.json` was
silently never read by the git integration at all. Both PRs (#1, #2) are
merged to `main` and pushed. Nothing blocked, nothing mid-flight.

## Resume prompt (paste into a new session)

```
Resume the vercel-manual-deploy work on catesworks/bambu-cli-mcp. Read
docs/sessions/2026-09-14-vercel-manual-deploy/README.md and FOLLOWUPS.md.
State: shipped and verified, both PRs merged to main. Next: nothing queued —
check FOLLOWUPS.md's nice-to-have list (org-wide rootDirectory audit) if
picking up related work.
```

## Repo state

| Repo | Branch | Last commit | Committed? | Pushed? | Notes |
|------|--------|-------------|-----------|---------|-------|
| catesworks/bambu-cli-mcp | main | `30fcab7` fix(ci): deploy from repo root, not docs-site, in vercel-deploy | yes | pushed | clean tree, in sync with origin |

Non-git state changed via Vercel API (not in git history, see `SUMMARY.md`):
project `rootDirectory` set to `docs-site`; repo-level `VERCEL_ACCESS_TOKEN`/
`VERCEL_ORG_ID` GitHub secrets deleted (org-wide shared secrets now apply).

## Read first (rebuilds context fastest)

1. `SUMMARY.md` — what changed and where, with commit SHAs
2. `LESSONS.md` — the two real bugs found and why they were non-obvious
3. `adr/0007-manual-vercel-deploy.md` — the deploy-strategy decision
4. `FOLLOWUPS.md` — what's left (mostly nice-to-have, nothing blocking)

## First action

None required — task is complete and verified. If resuming related work,
start with `FOLLOWUPS.md`'s "nice-to-have" item: audit other catesworks
repos using the same manual-Vercel-deploy pattern for the same
`rootDirectory`-unset bug.

## Dossier contents

- `SUMMARY.md` — what was done
- `LESSONS.md` — lessons learned
- `adr/0007-manual-vercel-deploy.md` — decision record
- `FOLLOWUPS.md` — open items
- `BLOG.md` — public write-up (⚠ review before publishing)
