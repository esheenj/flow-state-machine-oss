# Flow State Machine

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

For one-click public access, see the [verified-source GitHub Pages release process](docs/PAGES_RELEASE.md). A hosted demo URL will be advertised only after GitHub Pages is enabled and real HTTPS/browser checks confirm deployment; the local playground above already works.

## Scope

This is an illustrative client-side model, **not** a security authorization system, durable workflow scheduler or tamper-proof audit log. The snapshot inspector checks the *structure* of stored transitions; the replay/recorder APIs additionally re-evaluate guards against recorded inputs but cannot establish historical authenticity. History is capped at 500 accepted transitions. No persistent store, user accounts or deployment is included.

Contributions should contain original code and fictional examples only. Please do not submit employer, customer or private project material. Distributed as MIT-licensed source; npm registry publication is disabled by `private: true`.
