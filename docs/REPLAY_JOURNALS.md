# Guarded journal replay — reconstruct a UI journey, not just its shape

The original `inspectSnapshot(machine, saved)` checks transition history **structure**. A historically rejected event can still look structurally correct when an attacker invents the trail. To support reliable *local* restoration examples, the new `replayJournal` function reconstructs every field edit and every accepted event, in order.

No API keys, browser, model, network connection or npm dependencies are needed.

## Run the second fictional journey

```sh
npm run replay
npm test
```

The original `npm run demo` still works. The second example models a fictional support request: enter a subject, move it to triage, confirm approval and resolve it. Both original and replay demonstrations use invented data and local memory only.

## Strict replay contract

```js
import { replayJournal } from "./src/replay.mjs";

const machine = {
  start: "draft",
  nodes: {
    draft: { submit: { to: "review", require: { field: "headline", nonempty: true } } },
    review: { finish: { to: "done", require: { field: "approved", equals: true } } },
    done: {}
  }
};

const journal = {
  version: 1,
  initial: { headline: "", approved: false },
  actions: [
    { kind: "edit", patch: { headline: "Invented product sketch" } },
    { kind: "event", event: "submit" },
    { kind: "edit", patch: { approved: true } },
    { kind: "event", event: "finish" }
  ]
};

const restored = replayJournal(machine, journal);
const saved = JSON.parse(JSON.stringify(restored));
replayJournal(machine, journal, saved); // reconstructs and compares
```

The last argument is optional. If supplied, the saved state must **exactly match** the reconstructed state, fields and accepted transition trail. Any guard failure, unknown event, malformed action, sparse action list or inconsistent stored snapshot raises `FlowFault`, with no mutation. Each journal is limited to 500 actions. Events in the journal must be accepted events: do not persist failed attempts as if they were transitions.

The workflow definition also rejects unexpected properties on machines, edges or guards. Snapshots reject unexpected properties on their top-level object and transition trail entries. This prevents silently accepting unrecognised data when inspecting or replaying locally.

## Example of why replay matters

A saved trail may claim `draft → review` while the initial `headline` was empty. `inspectSnapshot` can verify that the edge exists, but **cannot know** that the guard was satisfied at the time. `replayJournal` rejects the same history because it re-runs the submit guard against the recorded field values.

**Security boundary:** Neither a journal nor its matching saved snapshot authenticates who created it. An attacker controlling *both* can fabricate another internally consistent journey, and a machine definition can change after the journal was made. For security-critical workflows, a trusted backend must enforce transitions and retain independently authenticated events, versioned definitions and authorisation receipts. This library does **not** provide tamper-proof audit, payment/trade admission or a durable scheduler.

## Help improve the example

Contributions are welcome when they use synthetic reproduction, clear counterexamples and the existing `npm test` checks. Please do not submit private customer, employer, financial or infrastructure source. Library remains MIT-licensed and `private: true` prevents accidental npm registry publication.
