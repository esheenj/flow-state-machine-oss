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

## Scope

This is an illustrative client-side model, **not** a security authorization system, durable workflow scheduler or tamper-proof audit log. It verifies the *structure* of stored transitions, not historical guard decisions. History is capped at 500 accepted transitions. No persistent store, user accounts or deployment is included.

Contributions should contain original code and fictional examples only. Please do not submit employer, customer or private project material. Distributed as MIT-licensed source; npm registry publication is disabled by `private: true`.
