import test from "node:test";
import assert from "node:assert/strict";
import { begin, editFields, advance, inspectMachine, inspectSnapshot, FlowFault } from "../src/flow.mjs";
import { sampleJourney, runExample } from "../examples/demo.mjs";

test("fictional journey handles invalid input, review and completion", () => {
  assert.deepEqual(runExample(), { blocked: "GUARD_FAILED", status: "finished", transitions: 2 });
  const start = begin(sampleJourney, { headline: "", confirmed: false });
  const denied = advance(sampleJourney, start, "submit");
  assert.equal(denied.ok, false);
  assert.strictEqual(denied.snapshot, start);
  assert.equal(start.trail.length, 0);
  const updated = editFields(sampleJourney, start, { headline: "Fictional request" });
  const review = advance(sampleJourney, updated, "submit").snapshot;
  assert.equal(review.at, "review");
  assert.equal(advance(sampleJourney, review, "accept").reason, "GUARD_FAILED");
  assert.equal(inspectSnapshot(sampleJourney, JSON.parse(JSON.stringify(review))), true);
});

test("rejects corrupted restored states and fake histories", () => {
  const start = begin(sampleJourney, { headline: "Synthetic", confirmed: true });
  const mid = advance(sampleJourney, start, "submit").snapshot;
  for (const forged of [
    { ...mid, at: "finished" },
    { ...mid, trail: [] },
    { ...mid, trail: [{ ...mid.trail[0], n: 3 }] },
    { ...mid, trail: [{ ...mid.trail[0], event: "accept" }] },
    { ...mid, trail: [{ ...mid.trail[0], to: "finished" }] }
  ]) {
    assert.throws(() => inspectSnapshot(sampleJourney, forged), FlowFault);
    assert.throws(() => advance(sampleJourney, forged, "accept"), FlowFault);
  }
});

test("definitions and events cannot use inherited properties as transitions", () => {
  assert.throws(() => inspectMachine({ start: "constructor", nodes: { draft: {} } }), FlowFault);
  assert.throws(() => inspectMachine({ start: "draft", nodes: { draft: { go: { to: "constructor" } } } }), FlowFault);
  const snapshot = begin(sampleJourney);
  const denied = advance(sampleJourney, snapshot, "constructor");
  assert.equal(denied.reason, "NO_EDGE");
  assert.strictEqual(denied.snapshot, snapshot);
  assert.throws(() => advance(sampleJourney, snapshot, "not valid"), FlowFault);
});

test("field edits are immutable and bounded; invalid values are refused", () => {
  const snapshot = begin(sampleJourney, { headline: "abc" });
  const next = editFields(sampleJourney, snapshot, { headline: "def" });
  assert.equal(snapshot.fields.headline, "abc");
  assert.equal(next.fields.headline, "def");
  assert.throws(() => editFields(sampleJourney, snapshot, { headline: null }), FlowFault);
  assert.throws(() => begin(sampleJourney, { score: Infinity }), FlowFault);
  assert.throws(() => begin(sampleJourney, { label: "x".repeat(501) }), FlowFault);
});

test("unknown transition does not mutate snapshot and serialization is deterministic", () => {
  const snap = begin(sampleJourney, { headline: "Hello" });
  const clone = JSON.parse(JSON.stringify(snap));
  assert.deepEqual(advance(sampleJourney, snap, "submit"),
    advance(sampleJourney, clone, "submit"));
  const denied = advance(sampleJourney, snap, "accept");
  assert.strictEqual(denied.snapshot, snap);
});
