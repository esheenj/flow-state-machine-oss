import test from "node:test";
import assert from "node:assert/strict";
import { createJournal, recordAction } from "../src/record.mjs";
import { replayJournal } from "../src/replay.mjs";
import { FlowFault } from "../src/flow.mjs";
import { supportJourney, supportJournal } from "../examples/replay_demo.mjs";

const copy = data => JSON.parse(JSON.stringify(data));
const edit = (id, patch) => ({ id, kind: "edit", patch });
const event = (id, name) => ({ id, kind: "event", event: name });

test("records a synthetic support journey into new detached, replayable journals", () => {
  const initial = { subject: "", approved: false };
  const original = createJournal(supportJourney, initial);
  initial.subject = "Changed later";
  assert.deepEqual(original.initial, { subject: "", approved: false });
  const op1 = edit("subject_edit", { subject: "Fictional community support" });
  const step1 = recordAction(supportJourney, original, op1);
  assert.equal(step1.ok, true);
  assert.equal(step1.reason, "RECORDED");
  assert.equal(original.actions.length, 0);
  assert.equal(step1.journal.actions.length, 1);
  assert.notStrictEqual(step1.journal, original);
  assert.notStrictEqual(step1.journal.initial, original.initial);
  assert.notStrictEqual(step1.journal.actions[0], op1);
  op1.patch.subject = "A changed external input";
  assert.equal(step1.journal.actions[0].patch.subject, "Fictional community support");

  const step2 = recordAction(supportJourney, step1.journal, event("submit_first", "send"), step1.snapshot);
  const step3 = recordAction(supportJourney, step2.journal, edit("approval_edit", { approved: true }));
  const step4 = recordAction(supportJourney, step3.journal, event("approve_first", "approve"));
  assert.equal(step4.journal.actions.length, 4);
  assert.equal(step4.snapshot.at, "resolved");
  assert.deepEqual(step4.snapshot.trail.map(x => x.event), ["send", "approve"]);
  const savedJournal = copy(step4.journal);
  const savedSnapshot = copy(step4.snapshot);
  assert.deepEqual(replayJournal(supportJourney, savedJournal, savedSnapshot), savedSnapshot);
  assert.deepEqual(step1.journal.actions.map(x => x.id), ["subject_edit"]);
  assert.deepEqual(original.actions, []);
});

test("guard or missing edge rejection does not create a false accepted event", () => {
  const journal = createJournal(supportJourney, { subject: "", approved: false });
  const before = copy(journal);
  for (const [name, reason] of [["send", "GUARD_FAILED"], ["approve", "NO_EDGE"]]) {
    const result = recordAction(supportJourney, journal, event("attempt_" + name, name));
    assert.equal(result.ok, false);
    assert.equal(result.reason, reason);
    assert.strictEqual(result.journal, journal);
    assert.equal(result.snapshot.at, "new");
    assert.deepEqual(journal, before);
  }
  const allowedEdit = recordAction(supportJourney, journal, edit("subject", { subject: "Synthetic" }));
  const allowed = recordAction(supportJourney, allowedEdit.journal, event("send", "send"));
  assert.equal(allowed.ok, true);
  const denied = recordAction(supportJourney, allowed.journal, event("approve_early", "approve"));
  assert.equal(denied.reason, "GUARD_FAILED");
  assert.strictEqual(denied.journal, allowed.journal);
});

test("reusing the same stable ID is idempotent; changed contents conflict", () => {
  const original = createJournal(supportJourney, { subject: "", approved: false });
  const op = edit("edit_1", { subject: "Fictional request" });
  const step1 = recordAction(supportJourney, original, op);
  const replay = recordAction(supportJourney, step1.journal, copy(op));
  assert.equal(replay.ok, true);
  assert.equal(replay.reason, "REPLAY_REUSED");
  assert.strictEqual(replay.journal, step1.journal);
  assert.deepEqual(replay.snapshot, step1.snapshot);
  assert.equal(replay.journal.actions.length, 1);
  assert.throws(() => recordAction(supportJourney, step1.journal,
    edit("edit_1", { subject: "Conflict" })), /Conflicting replay operation ID/);
  assert.throws(() => recordAction(supportJourney, step1.journal,
    event("edit_1", "send")), FlowFault);

  const step2 = recordAction(supportJourney, step1.journal, event("send_1", "send"));
  const delayedRetry = recordAction(supportJourney, step2.journal, copy(op), replayJournal(supportJourney, original));
  assert.equal(delayedRetry.reason, "REPLAY_REUSED");
  assert.equal(delayedRetry.snapshot.at, "triage");
  assert.strictEqual(delayedRetry.journal, step2.journal);
  const unrelatedRepeat = recordAction(supportJourney, step2.journal, event("send_2", "send"));
  assert.equal(unrelatedRepeat.ok, false);
  assert.equal(unrelatedRepeat.reason, "NO_EDGE");
  assert.strictEqual(unrelatedRepeat.journal, step2.journal);
});

test("optional precondition prevents stale edits and mismatched saved snapshots", () => {
  const initial = createJournal(supportJourney, { subject: "Initial", approved: false });
  const state = replayJournal(supportJourney, initial);
  const s1 = recordAction(supportJourney, initial, edit("first", { subject: "Updated" }), state);
  assert.throws(() => recordAction(supportJourney, s1.journal,
    event("send_id", "send"), state), /Recorder precondition/);
  const s2 = recordAction(supportJourney, s1.journal,
    event("send_id", "send"), s1.snapshot);
  assert.equal(s2.snapshot.at, "triage");
  assert.throws(() => recordAction(supportJourney, s2.journal,
    edit("later", { approved: true }),
    { ...s2.snapshot, at: "resolved" }), FlowFault);
  assert.deepEqual(initial.actions, []);
});

test("malformed operation, unknown keys and dangerous field values reject safely", () => {
  const journal = createJournal(supportJourney);
  const before = copy(journal);
  const bad = [
    null, [], {}, { kind: "edit", patch: {} },
    edit("", {}), edit("UPPERCASE", {}), edit("a".repeat(41), {}),
    { id: "attempt", kind: "event", event: 5 },
    { id: "attempt", kind: "event", event: "send", approve: true },
    { id: "attempt", kind: "shell", command: "secret" },
    { id: "attempt", kind: "edit", patch: null },
    { id: "attempt", kind: "edit", patch: { subject: null } },
    edit("overflow", { subject: "z".repeat(501) }),
    edit("bad_number", { cost: Infinity }),
    edit("nested", { data: { token: "not allowed" } }),
  ];
  for (const instruction of bad) {
    assert.throws(() => recordAction(supportJourney, journal, instruction),
      FlowFault);
  }
  assert.deepEqual(journal, before);
});

test("corrupted or duplicate-ID stored journals fail even if state looks plausible", () => {
  const original = createJournal(supportJourney, { subject: "", approved: false });
  const first = recordAction(supportJourney, original, edit("duplicate_id", { subject: "Fictional" }));
  const forged = copy(first.journal);
  forged.actions.push(edit("duplicate_id", { approved: true }));
  assert.throws(() => replayJournal(supportJourney, forged), /Duplicate replay operation ID/);
  assert.throws(() => recordAction(supportJourney, forged,
    event("send", "send")), /Duplicate replay operation ID/);
  const changed = copy(first.journal);
  changed.actions[0].patch.subject = "";
  assert.throws(() => replayJournal(supportJourney, changed, first.snapshot),
    /Replay does not match expected snapshot/);
  const extra = copy(first.journal);
  extra.actions[0].authorised = true;
  assert.throws(() => replayJournal(supportJourney, extra), FlowFault);
});

test("recorder supports earlier ID-less journals and preserves their old format", () => {
  const old = copy(supportJournal);
  const state = replayJournal(supportJourney, old);
  const newStep = recordAction(supportJourney, old, edit("note_1", { note: "Fictional post-resolution note" }), state);
  assert.equal(newStep.ok, true);
  assert.equal(newStep.snapshot.at, "resolved");
  assert.equal(newStep.journal.actions.length, 5);
  assert.equal(old.actions.length, 4);
  assert.equal("id" in newStep.journal.actions[0], false);
  assert.equal(newStep.journal.actions[4].id, "note_1");
  assert.deepEqual(replayJournal(supportJourney, copy(newStep.journal), copy(newStep.snapshot)),
    newStep.snapshot);
});

test("500-action bound rejects overflow but permits safe replay of original ID", () => {
  const journal = {
    version: 1,
    initial: { subject: "Fictional" },
    actions: Array.from({ length: 500 }, (_, i) => edit("op_" + i, {})),
  };
  const saved = copy(journal);
  assert.equal(replayJournal(supportJourney, journal).at, "new");
  assert.equal(recordAction(supportJourney, journal, edit("op_499", {})).reason, "REPLAY_REUSED");
  assert.throws(() => recordAction(supportJourney, journal, edit("op_500", {})), /Journal action limit/);
  assert.deepEqual(journal, saved);
  const overflow = { ...journal, actions: [...journal.actions, edit("op_500", {})] };
  assert.throws(() => replayJournal(supportJourney, overflow), FlowFault);
});
