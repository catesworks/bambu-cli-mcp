<!--
PUBLIC blog post draft. ⚠ SANITIZE before publishing:
  - Remove client names, internal repo/package names, hostnames, ticket ids, secrets.
  - Generalize the setting ("a multi-tenant SaaS", "an internal infra monorepo").
  - When in doubt, leave it out. Ask the user before publishing anywhere.
Keep it a story about the PROBLEM and the TECHNIQUE, not the proprietary system.
-->

# Turning off Vercel's auto-deploy took three tries — here's why

*Setting `deploymentEnabled: false` in `vercel.json` looks like it should be
enough. It isn't, and the reason is easy to miss.*

## The problem

A small docs site was deploying to Vercel automatically on every push to
`main`, wired through a GitHub Actions workflow that ran `vercel --prod` on
push. The goal was simple: make deploys manual — a human explicitly
triggers them, with a choice between a production deploy and a preview —
instead of every doc typo burning a build.

The obvious fix looked like two changes: swap the workflow's trigger from
`push` to `workflow_dispatch`, and add Vercel's own
`git.deploymentEnabled: false` to `vercel.json` so the platform's *own* git
integration doesn't also deploy independently of the workflow.

That should have been it. It took three separate bugs, each hiding behind
the previous one, to actually get there.

## What I tried

**First bug: wildcards that aren't wildcards.** The first pass at
`vercel.json` used a per-branch object, expecting `"*"` and `"**"` to mean
"every branch":

```json
{ "git": { "deploymentEnabled": { "*": false, "**": false, "main": false } } }
```

Opening a pull request from an unrelated branch still triggered an
automatic deploy. It turns out `deploymentEnabled`'s object form only
matches *literal* branch names — `"*"` isn't a glob, it's just a branch
name that happens not to exist. Any branch not explicitly listed defaults
to enabled. The fix is the boolean form, which really does apply to
everything:

```json
{ "git": { "deploymentEnabled": false } }
```

**Second bug: the config was never being read at all.** With the boolean
fix merged, a push to the main branch *still* auto-deployed — and this
time the build failed outright with a generic "no output directory found"
error. The site lived in a subdirectory of the repo, and its `vercel.json`
lived there too. But the Vercel *project's* Root Directory setting had
never been configured — it defaulted to the repo root. The git integration
was building from the repo root and had never once looked inside the
subdirectory, which means it had never read the `vercel.json` living
there — including the `deploymentEnabled` fix. No error pointed at this;
the only symptom was "the setting doesn't seem to work" plus an unrelated
build failure.

**Third bug: fixing the second one broke the manual workflow.** Once the
project's Root Directory was correctly set to the subdirectory, the manual
deploy workflow started failing instead — it had a `cd` into that same
subdirectory baked in, and the Vercel CLI *also* appends the project's Root
Directory setting to wherever it's invoked from. Two sources of the same
path segment stacked into a path that didn't exist. The fix was to stop
`cd`-ing in the workflow and let the CLI apply the Root Directory setting
on its own, from the repo root.

## What I learned

- A platform config value that "does nothing" is often not being read at
  all, rather than being read and ignored — check where it's read *from*
  before assuming the value itself is wrong.
- Don't assume a key that looks like a glob pattern (`"*"`, `"**"`) is
  actually treated as one by a given tool's schema — read the docs for
  that exact field, not the convention from a different tool.
- When two layers can each apply the same path segment (a CI job's working
  directory and a platform's own root-directory setting), pick exactly one
  layer to own it. Verify by testing the failure mode, not just the happy
  path — the "it doesn't deploy when I don't want it to" case needs its own
  check, separate from "it deploys when I do want it to."

## Takeaways

- Flipping an auto-deploy switch off isn't verified by "it stopped
  happening once" — verify by deliberately triggering the condition that
  used to cause it (open a PR, push a commit) and confirming nothing fires.
- A single "disable this" setting can silently depend on an entirely
  separate piece of platform configuration (root directory, in this case)
  that has nothing to do with the setting's own key name.
- When a fix for bug #2 breaks something that bug #1's fix had been
  quietly relying on, that's not a coincidence — it usually means two
  pieces of config were compensating for each other's absence. Worth
  re-checking the whole chain once the *first* domino falls, not just the
  next one.

---

<!-- Suggested tags: vercel, ci-cd, github-actions, deployment, debugging · Est. reading time: 5 min · Cross-post targets: personal blog, dev.to -->
