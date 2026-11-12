# Flow State Machine

**Explore more open-source tools:** [Browse the live Esheen Labs AI and developer playgrounds](https://esheenj.github.io/compound-intelligence-starter/) for agent trust, prompt evaluation, dataset quality, UX patterns, design systems and engineering utilities. Each featured project links to its public source and interactive demo. Additional browser tools may live within an existing repository; demo-page totals should not be mistaken for separate GitHub repositories. All examples use fictional data and have documented limitations.

**Who this is for:** Explore guarded transitions and replayable workflows through an interactive example.

**[Open the GitHub-deployed workflow/journal playground](https://esheenj.github.io/flow-state-machine-oss/)** — [GitHub Pages deployment](https://github.com/esheenj/flow-state-machine-oss/actions/runs/42580396953) and live HTTPS browser smoke verified on **9 November 2026**. Try the fictional guard, journal and restore journey.

A small, **offline JavaScript state-machine library** for learning about deterministic UI journeys, guarded transitions and validating a serialized history. Entirely synthetic; no accounts, network APIs or dependencies.

## Run

Requires Node.js 20+:

```sh
npm test
npm run demo
```

Use `begin(machine)`, `editFields(machine, snapshot, patch)`, `advance(machine, snapshot, event)` and `inspectSnapshot(machine, snapshot)` from `src/flow.mjs`. The fictional journey demonstrates an initially rejected submission, a successful review and confirmation, and an inspectable transition trail.

A rejected event returns the **same session reference** without mutating it. Bad definitions, forged history, invalid fields and unsafe keys fail with `FlowFault`. Test fixtures deliberately include those cases.

## New: replay a saved journey and verify its guards

A transition trail can look valid even when an old guard was not satisfied. The new `replayJournal(machine, journal, expectedSnapshot?)` reconstructs a synthetic journey from its field edits and accepted events, rejects malformed journals and guard failures, and optionally compares the result with a previously saved snapshot.

```sh
npm run replay
npm test
```

This demonstrates a **second fictional support-request journey** and safe local restoration. See [the guarded journal replay guide](docs/REPLAY_JOURNALS.md) for code, limitations and negative cases. The original `npm run demo` remains unchanged.

## New: immutable recording with safe retry

The companion `createJournal(machine, initial)` and `recordAction(machine, journal, instruction, expectedBefore?)` build a replayable journey without writing event JSON by hand. Each accepted edit or event gets a **stable ID** so a repeated request can reuse its original entry, while a conflicting retry or stale state is rejected. Invalid guards leave the original journal unchanged.

```sh
npm run record
npm run replay
npm test
```

[See the Recorder guide](docs/RECORD_JOURNALS.md) for synthetic examples, JSON restoration and limitations. IDs are local deduplication keys, not transaction receipts or security credentials.

## New: interactive zero-build browser playground

Try the real library in a fictional support-request UI without installing npm packages or configuring a backend:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open **[localhost:8000/examples/playground.html](http://127.0.0.1:8000/examples/playground.html)** in your browser. Save a fictional subject, attempt guarded transitions, inspect accepted actions as JSON, and restore that journal. The runtime modules now import in native browser ESM; no bundler, credentials, telemetry or external APIs.

[Full playground walkthrough and real Chrome test coverage](docs/BROWSER_PLAYGROUND.md). Existing `npm test`, `npm run demo`, `npm run replay` and `npm run record` remain available; the GitHub Actions PR workflow also verifies the browser interaction using ChromeDriver.

For one-click public access, see the [verified-source GitHub Pages release process](docs/PAGES_RELEASE.md). The live browser evidence and its limits are recorded in that guide.

## Contribute a small tested improvement

New developers can follow [CONTRIBUTING.md](CONTRIBUTING.md) and the [scoped good first tasks](docs/GOOD_FIRST_ISSUES.md). The repository now has a structured bug-report form and PR checklist. Start from a fictional guard/retry example, add one deterministic test and run `npm test`, `npm run replay` and `npm run record`. For browser changes, test the allowlisted staged playground with real Chrome.

## Scope

This is an illustrative client-side model, **not** a security authorization system, durable workflow scheduler or tamper-proof audit log. The snapshot inspector checks the *structure* of stored transitions; the replay/recorder APIs additionally re-evaluate guards against recorded inputs but cannot establish historical authenticity. History is capped at 500 accepted transitions. The demo has no persistent store or user accounts; the public deployment serves static files only.

Contributions should contain original code and fictional examples only. Please do not submit employer, customer or private project material. Distributed as MIT-licensed source; npm registry publication is disabled by `private: true`.

## Additional browser MVP: Journey Map Studio

[Open the fictional Journey Map Studio](https://esheenj.github.io/flow-state-machine-oss/journey.html) to describe up to ten invented experience steps, stage handoffs, subjective effort, emotion and help availability. The `src/journey-map.mjs` model validates inputs and returns deterministic observable **heuristic** flags; `src/journey-map-ui.mjs` uses native semantic controls and DOM text nodes only. The project's exact-file Pages stager now includes this tool, with Node negative tests and staged real Chrome checks.

It is **not** actual journey research, measurement of abandonment, an accessibility audit or a new standalone repository. No actual user records, telemetry, remote service or extra dependencies; original fictional examples only. Browser code and public GitHub Pages publisher are separate checks from real external acceptance.

## Additional browser MVP: Service Blueprint Studio

[Open the fictional Service Blueprint Studio](https://esheenj.github.io/flow-state-machine-oss/blueprint.html) to model invented customer touchpoints, frontstage interactions, backstage operations, dependency mapping and estimated manual-handoff delays. `src/service-blueprint.mjs` is a strict, immutable 2–8-step model with explicit negative tests. Native semantic controls and safe DOM text rendering provide interactive review offline. The exact-file GitHub Pages staging and real Chrome QA include this original tool.

This is a synthetic service-design worksheet, not collected customer research, an operational SLA, employer/client process intelligence or a validated business model. It makes no network calls, uploads, tracking or real-world automation, requires no additional runtime dependencies and does not create another public repository.

## New offline add-on: Agent Approval Gates

[Try the Agent Approval Gates playground](https://esheenj.github.io/flow-state-machine-oss/approval.html). It demonstrates a **fictional, local-only** review state machine: a pending invented request can be denied, reopened, reviewed, and either blocked or simulated as complete. Write/transfer scenarios are denied by example policy even after a simulated approval. The pure model `src/agent-approval.mjs` rejects conflicting duplicate event IDs, invalid transitions, unknown actions and secret-bearing extra fields, with positive/negative Node tests and staged real Chrome regression checks. All event IDs are fictional and only source files allowlisted by `scripts/stage_pages.mjs` are hosted.

**No real action is executed or authorized.** Clicked approval is not authenticated consent. This teaches fail-closed UI and deterministic replay—not actual authorization for tools, finance, payments, cloud systems or agents. No network endpoints, telemetry, runtime dependencies or new recurring infrastructure expense.
