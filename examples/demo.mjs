import { begin, editFields, advance, inspectSnapshot } from "../src/flow.mjs";

export const sampleJourney = {
  start: "draft",
  nodes: {
    draft: { submit: { to: "review", require: { field: "headline", nonempty: true } } },
    review: {
      accept: { to: "finished", require: { field: "confirmed", equals: true } },
      revise: { to: "draft" }
    },
    finished: {}
  }
};

export function runExample() {
  const initial = begin(sampleJourney, { headline: "", confirmed: false });
  const blocked = advance(sampleJourney, initial, "submit");
  const filled = editFields(sampleJourney, initial, { headline: "Imaginary picnic plan" });
  const reviewed = advance(sampleJourney, filled, "submit");
  const approved = advance(sampleJourney,
    editFields(sampleJourney, reviewed.snapshot, { confirmed: true }), "accept");
  inspectSnapshot(sampleJourney, approved.snapshot);
  return { blocked: blocked.reason, status: approved.snapshot.at,
    transitions: approved.snapshot.trail.length };
}
if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(JSON.stringify(runExample(), null, 2) + "\n");
}
