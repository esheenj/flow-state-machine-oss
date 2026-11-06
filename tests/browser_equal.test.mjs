import test from "node:test";
import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util"; // Test-only baseline, NOT browser source.
import { equalJSON } from "../src/equal_json.mjs";
import { createJournal, recordAction } from "../src/record.mjs";
import { replayJournal } from "../src/replay.mjs";
import { supportJourney } from "../examples/replay_demo.mjs";

const jsonCases = [
  [null, null], [true, true], [false, true], [0, -0], [1, 1], [1, "1"],
  ["hello", "hello"], ["hello", "Hello"], [{ a: 1, b: 2 }, { b: 2, a: 1 }],
  [{ a: 1, b: 2 }, { a: 1, b: 3 }], [{ a: [1, 2] }, { a: [1, 2] }],
  [{ a: [1, 2] }, { a: [2, 1] }], [{ nested: { bool: true, text: "" } },
    { nested: { text: "", bool: true } }], [[], {}], [[], []],
  [[], [null]], [[{ x: 3 }], [{ x: 3, y: 4 }]],
  [{ num: 2 }, { num: 2.0 }], [{ zero: 0 }, { zero: -0 }],
];

test("portable equality agrees with Node strict comparison for valid JSON shapes", () => {
  for (const [a, b] of jsonCases) {
    assert.equal(equalJSON(a, b), isDeepStrictEqual(a, b),
      "comparison of " + JSON.stringify([a, b]));
    assert.equal(equalJSON(b, a), isDeepStrictEqual(b, a));
  }
});

test("portable equality handles old and new workflow snapshots on both sides", () => {
  const original = createJournal(supportJourney, { subject: "", approved: false });
  const action = { id: "subject_1", kind: "edit", patch: { subject: "Fictional local question" } };
  const first = recordAction(supportJourney, original, action);
  const roundTripJournal = JSON.parse(JSON.stringify(first.journal));
  const roundTripSnapshot = JSON.parse(JSON.stringify(first.snapshot));
  assert.equal(equalJSON(roundTripSnapshot, first.snapshot), true);
  assert.deepEqual(replayJournal(supportJourney, roundTripJournal, roundTripSnapshot),
    roundTripSnapshot);
  assert.equal(recordAction(supportJourney, first.journal, action).reason, "REPLAY_REUSED");
  assert.throws(() => recordAction(supportJourney, first.journal, {
    id: "subject_1", kind: "edit", patch: { subject: "Conflicting request" }
  }), /Conflicting replay operation ID/);
  const forged = { ...roundTripSnapshot,
    fields: { ...roundTripSnapshot.fields, subject: "Tampered" } };
  assert.equal(equalJSON(first.snapshot, forged), false);
  assert.throws(() => replayJournal(supportJourney, first.journal, forged),
    /Replay does not match expected snapshot/);
});

test("comparison refuses unsupported host objects and symbols rather than trusting them", () => {
  assert.equal(equalJSON(new Date(0), new Date(0)), false);
  assert.equal(equalJSON(new Set([1]), new Set([1])), false);
  const symbol = Symbol("foreign");
  assert.equal(equalJSON({ a: 1, [symbol]: 1 }, { a: 1 }), false);
});

test("browser-facing library source uses no Node built-ins or HTTP calls", async () => {
  const fs = await import("node:fs/promises");
  for (const path of ["src/equal_json.mjs", "src/flow.mjs",
                      "src/record.mjs", "src/replay.mjs", "examples/playground.mjs"]) {
    const source = await fs.readFile(new URL("../" + path, import.meta.url), "utf8");
    assert.doesNotMatch(source, /(?:from|import\()\s*["']node:/);
    assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|https?:\/\//);
  }
});
