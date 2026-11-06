# Immutable UI journal recorder — record, save and replay

Developers usually need to construct a journal manually before testing `replayJournal`. The new `createJournal` and `recordAction` functions let a fictional UI flow record **only valid accepted operations** as immutable state, then verify a JSON save-and-restore round trip. No server, browser, network, storage driver or dependency is required.

## Try in seconds

```sh
npm test
npm run record
npm run replay
```

Run the new fictional repair-café support-request demo. Its first event intentionally fails the subject guard; it is NOT logged as an accepted event. The subsequent accepted edits and events resolve the ticket and replay from JSON.

## Call the API

```js
import { createJournal, recordAction } from "./src/record.mjs";
import { replayJournal } from "./src/replay.mjs";

const machine = {
  start: "new",
  nodes: {
    new: { send: { to: "review", require: { field: "subject", nonempty: true } } },
    review: { finish: { to: "done" } },
    done: {}
  }
};
const initial = createJournal(machine, { subject: "" });
const edit = recordAction(machine, initial, {
  id: "edit_subject_001", kind: "edit", patch: { subject: "Invented question" }
});
const sent = recordAction(machine, edit.journal, {
  id: "send_001", kind: "event", event: "send"
}, edit.snapshot);

// Save these values to JSON in your own app (this library writes no files).
const journalCopy = JSON.parse(JSON.stringify(sent.journal));
const snapshotCopy = JSON.parse(JSON.stringify(sent.snapshot));
replayJournal(machine, journalCopy, snapshotCopy);
```

Each `recordAction` operation requires a **stable, caller-provided lowercase ID**, e.g. `send_001`. The id is NOT a credential, UUID generator, transaction ID or identity proof. If the same ID and unchanged operation are retried on the recorded journal, the result is `{ok:true, reason:"REPLAY_REUSED"}` with the **same journal reference** and **latest** reconstructed snapshot; the operation is not appended twice. Reusing the ID with different contents raises `FlowFault` and does not mutate anything.

Each successful new operation returns `{ok:true, reason:"RECORDED", journal, snapshot}` with a detached journal and field history. Rejected events return `{ok:false, reason:"GUARD_FAILED"|"NO_EDGE", journal, snapshot}` and the **exact original journal reference**. Invalid instructions, stale optional `expectedBefore` state, repeated different requests with the same ID, duplicate recorded IDs, invalid fields or overflowing the 500-action journal limit fail closed.

**Compatibility:** The replay tool accepts historical actions with no IDs; it verifies guards just as before. New recorder actions must include IDs. A journal with earlier ID-less entries can be extended with ID-bearing new actions. Optional `expectedBefore` is checked on *new* operations to reject stale UI edits. A retry of an already-recorded ID is recovered by its original identity even if the caller's old snapshot is stale.

## What this is not

**This is not authenticated event sourcing.** Whoever can change the journal, snapshot or machine definition can create a different self-consistent history. It is not authorisation, identity, payments, crypto orders, a distributed lock, a service, durable transactional storage or a production audit. A real system needs backend authority, independent provenance, durable receipt recovery and versioned machine definitions. This educational library intentionally implements none of those.

All examples contain fictional subjects. Please do not publish private customer, employer, financial or trading data. Original source is MIT-licensed, offline, and retains npm `private:true` to prevent accidental registry publication.
