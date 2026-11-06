import { replayJournal } from "../src/replay.mjs";

export const supportJourney = {
  start: "new",
  nodes: {
    new: { send: { to: "triage", require: { field: "subject", nonempty: true } } },
    triage: {
      approve: { to: "resolved", require: { field: "approved", equals: true } },
      revise: { to: "new" }
    },
    resolved: {}
  }
};

export const supportJournal = {
  version: 1,
  initial: { subject: "", approved: false },
  actions: [
    { kind: "edit", patch: { subject: "Fictional library question" } },
    { kind: "event", event: "send" },
    { kind: "edit", patch: { approved: true } },
    { kind: "event", event: "approve" }
  ]
};

export function runReplayExample() {
  const result = replayJournal(supportJourney, supportJournal);
  const saved = JSON.parse(JSON.stringify(result));
  replayJournal(supportJourney, supportJournal, saved);
  return { status: result.at, transitions: result.trail.length,
    operations: supportJournal.actions.length, restored: true };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(JSON.stringify(runReplayExample(), null, 2) + "\n");
}
