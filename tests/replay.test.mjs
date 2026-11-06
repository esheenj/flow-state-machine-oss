import test from "node:test";
import assert from "node:assert/strict";
import { replayJournal } from "../src/replay.mjs";
import { begin, inspectMachine, inspectSnapshot, advance, FlowFault } from "../src/flow.mjs";
import { sampleJourney } from "../examples/demo.mjs";
import { supportJourney, supportJournal, runReplayExample } from "../examples/replay_demo.mjs";

const copy = value => JSON.parse(JSON.stringify(value));

test("second fictional journey replays edits and historically accepted guards", () => {
  const startInput = copy(supportJournal);
  const original = copy(startInput);
  const restored = replayJournal(supportJourney, startInput);
  assert.deepEqual(runReplayExample(),
    { status: "resolved", transitions: 2, operations: 4, restored: true });
  assert.equal(restored.at, "resolved");
  assert.deepEqual(restored.fields,
    { subject: "Fictional library question", approved: true });
  assert.deepEqual(restored.trail.map(x => x.event), ["send", "approve"]);
  assert.deepEqual(replayJournal(supportJourney, startInput, copy(restored)), restored);
  assert.deepEqual(startInput, original, "replay must not mutate the input");
});

test("a structurally valid transition can still be historically invalid", () => {
  const journal = { version: 1,
    initial: { headline: "", confirmed: false },
    actions: [{ kind: "event", event: "submit" }] };
  const forged = { at: "review",
    fields: { headline: "", confirmed: false },
    trail: [{ n: 1, from: "draft", event: "submit", to: "review" }] };
  assert.equal(inspectSnapshot(sampleJourney, forged), true,
    "the older structural inspector cannot reconstruct past guard inputs");
  assert.throws(() => replayJournal(sampleJourney, journal, forged),
    /Rejected transition in replay: GUARD_FAILED/);
  const unknown = { version: 1, initial: {},
    actions: [{ kind: "event", event: "accept" }] };
  assert.throws(() => replayJournal(sampleJourney, unknown), FlowFault);
});

test("a changed saved state or history cannot masquerade as replay result", () => {
  const expected = replayJournal(supportJourney, supportJournal);
  const tampered = [
    { ...expected, at: "triage" },
    { ...expected, fields: { ...expected.fields, approved: false } },
    { ...expected, fields: { ...expected.fields, subject: "Other valid phrase" } },
    { ...expected, trail: expected.trail.slice(0, 1) },
    { ...expected, trail: expected.trail.map(x => ({ ...x, n: x.n + 1 })) }
  ];
  for (const value of tampered) {
    assert.throws(() => replayJournal(supportJourney, supportJournal, value),
      FlowFault);
  }
});

test("malformed journal, unknown action and invalid snapshots fail predictably", () => {
  const bad = [
    {},
    [],
    null,
    { ...supportJournal, version: 2 },
    { ...supportJournal, extra: "unexpected" },
    { ...supportJournal, actions: null },
    { ...supportJournal, actions: Array(2) },
    { ...supportJournal, actions: Array.from({length: 501}, () => ({kind:"edit",patch:{}})) },
    { ...supportJournal, initial: { subject: null } },
    { ...supportJournal, actions: [{ kind: "edit", patch: { score: Infinity } }] },
    { ...supportJournal, actions: [{ kind: "edit", patch: null }] },
    { ...supportJournal, actions: [{ kind: "edit", patch: {}, extraneous: true }] },
    { ...supportJournal, actions: [{ kind: "event", event: 5 }] },
    { ...supportJournal, actions: [{ kind: "event", event: "unknown" }] },
    { ...supportJournal, actions: [{ kind: "event", event: "send", superuser: true }] },
    { ...supportJournal, actions: [{ kind: "shell", command: "echo unsafe" }] },
  ];
  for (const journal of bad) {
    assert.throws(() => replayJournal(supportJourney, journal), FlowFault);
  }
});

test("machine guards and stored snapshots reject extra unexpected properties", () => {
  const original = copy(supportJourney);
  assert.equal(inspectMachine(original), true);
  assert.throws(() => inspectMachine({ ...original, secret: true }), FlowFault);
  const extraRule = copy(original);
  extraRule.nodes.new.send.allowAll = true;
  assert.throws(() => inspectMachine(extraRule), FlowFault);
  const extraGuard = copy(original);
  extraGuard.nodes.new.send.require.override = true;
  assert.throws(() => inspectMachine(extraGuard), FlowFault);
  const snapshot = begin(original, { subject: "hello" });
  assert.throws(() => inspectSnapshot(original, { ...snapshot, proof: "fake" }), FlowFault);
  const moved = advance(original, snapshot, "send").snapshot;
  const fakeTrail = { ...moved, trail: [{ ...moved.trail[0], authorized: true }] };
  assert.throws(() => inspectSnapshot(original, fakeTrail), FlowFault);
});

test("strict replay does not confuse approved-now with approved-then", () => {
  const journal = {
    version: 1,
    initial: { subject: "Draft", approved: false },
    actions: [
      { kind: "event", event: "send" },
      { kind: "event", event: "approve" },
      { kind: "edit", patch: { approved: true } }
    ]
  };
  assert.throws(() => replayJournal(supportJourney, journal),
    /Rejected transition in replay: GUARD_FAILED/);
  const corrected = {
    ...journal,
    actions: [journal.actions[0], journal.actions[2], journal.actions[1]]
  };
  assert.equal(replayJournal(supportJourney, corrected).at, "resolved");
});

test("a structurally valid changed journal is not authenticated or authoritative", () => {
  const a = copy(supportJournal);
  const b = copy(supportJournal);
  b.actions[0].patch.subject = "Different synthetic phrase";
  const snapshotA = replayJournal(supportJourney, a);
  const snapshotB = replayJournal(supportJourney, b);
  assert.notDeepEqual(snapshotA, snapshotB);
  assert.throws(() => replayJournal(supportJourney, b, snapshotA), FlowFault);
  // A malicious party who can replace BOTH journal and expected snapshot can
  // still make the local check pass; only an external trusted record helps.
  assert.deepEqual(replayJournal(supportJourney, b, snapshotB), snapshotB);
});
