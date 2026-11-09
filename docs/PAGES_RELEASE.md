# Publishing the public browser playground with GitHub Pages

**Verified public release (9 November 2026):** [deployment run 42580396953](https://github.com/esheenj/flow-state-machine-oss/actions/runs/42580396953) published source `aeb3815d14b2cca00d301115e6dd6f6e9788c973` to the [live Pages site](https://esheenj.github.io/flow-state-machine-oss/). A separate Chrome browser opened the actual HTTPS playground, observed the empty-subject guard reject without recording an action, resolved a fictional request (four accepted actions, two transitions), and restored its journal after reset. This smoke did not audit network traffic, screen-reader announcements, mobile hardware, or accessibility conformance.

This repository has a **zero-build fictional workflow demo** in
`examples/playground.html`. The public website bundle is intentionally limited to
the landing page, browser demo and four required MIT-licensed source modules.
It does **not** publish repository policies, GitHub workflow files, tests,
private material, CI secrets or unrelated files.

## One-time Pages enablement (only if not already enabled)

GitHub requires the repository Pages source to be enabled by an authorised
repository administrator. The normal GitHub Actions `GITHUB_TOKEN` can
deploy to an *enabled* Pages site but **cannot create that site**. This
repository does not request a broad administration token in CI.

In the GitHub UI for **esheenj/flow-state-machine-oss**, visit
**Settings → Pages → Build and deployment → Source → GitHub Actions**.
Save if needed. This is the only optional owner-side action; it does not
introduce a subscription or another server.

The trusted deployment workflow
`.github/workflows/publish-playground.yml` triggers **only after a
successful main-branch push run** of `Verify workflow examples`.
It checks the exact successful CI source SHA, verifies Pages is enabled
with Actions as source using the scoped existing `GITHUB_TOKEN`, stages the
minimal allowlisted bundle with `node scripts/stage_pages.mjs dist/pages`,
then publishes with GitHub's first-party Pages actions. It does not deploy
pull requests and does not create an independent scheduler.

If the site is not yet enabled, the deployment job deliberately fails with
an actionable `Settings → Pages` message. After changing that setting,
rerun the latest **Publish verified public playground** job from GitHub
Actions, or make a subsequent tested main-branch source change.

## Verify a deployed release

Check the deployment run for exact source SHA, successful Pages output URL,
and then load that **actual HTTPS URL** in a browser. The expected paths
under that verified base are:

- `/` — source-filtered landing page
- `/examples/playground.html` — interactive fictional support-request example
- `/src/*.mjs` — four same-origin JavaScript modules

The `examples/playground.mjs` module imports the real recorder/replay code
via `../src/`. The site never sends a journal to a server.
In a real browser, verify guarded denial without a recorded event, accepted
field edits, accepted transitions, JSON restoration, no external requests
and keyboard skip-link behavior. A green Actions test suite is not itself
proof of live HTTPS publication. Add a clickable public README demo link
only after verifying a deployed URL and browser behavior.

## Run the exact artifact locally

```sh
npm test
node scripts/stage_pages.mjs dist/pages
FLOW_PLAYGROUND_ROOT=dist/pages python3 tests/browser_playground.py
```

The ChromeDriver script requires Google Chrome and ChromeDriver, which are
preinstalled on the GitHub Ubuntu 24.04 test runners. It runs a temporary
`127.0.0.1` server and tests exactly the staged site that Pages would
upload. The existing Node tests also prove the output contains no extra
files, and that staging refuses to replace a previous bundle.

## Source, safety and rollback

Only original fictional data and public code are included. The hosting
workflow has repository-scoped `pages: write` and OIDC `id-token: write`
on the deployment job, never on pull-request tests. No long-lived API
token, paid infrastructure, private Cortex/Commander code, financial/trading
code or customer data are involved.

Rollback: revert the public source PR and let its exact-head CI succeed,
which triggers a deployment of the reverted bundle. If Pages must be
taken offline urgently, a repository administrator can disable publishing
from **Settings → Pages**. Neither workflow nor demo authenticates UI
events or provides server-side execution authority.

**Status rule:** Do not claim a hosted URL, actual deployment, mobile
hardware validation, screen-reader conformance or adoption metrics unless
that evidence is independently observed.
