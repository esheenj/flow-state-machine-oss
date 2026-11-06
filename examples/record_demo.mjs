import { pathToFileURL } from "node:url";
import { createJournal, recordAction } from "../src/record.mjs";
import { replayJournal } from "../src/replay.mjs";
import { supportJourney } from "./replay_demo.mjs";

export function runRecordExample() {
  let journal = createJournal(supportJourney, { subject: "", approved: false });
  const denied = recordAction(supportJourney, journal, {
    id: "blocked_send", kind: "event", event: "send"
  });
  if (denied.ok || denied.reason !== "GUARD_FAILED" || denied.journal !== journal) {
    throw Error("Fictional guard check failed");
  }
  const actions = [
    { id: "subject_1", kind: "edit", patch: { subject: "Fictional repair café question" } },
    { id: "send_1", kind: "event", event: "send" },
    { id: "approve_1", kind: "edit", patch: { approved: true } },
    { id: "resolve_1", kind: "event", event: "approve" },
  ];
  for (const instruction of actions) {
    const result = recordAction(supportJourney, journal, instruction);
    if (!result.ok) throw Error("Fictional accepted operation failed");
    journal = result.journal;
  }

  // A real app could save these JSON values locally; no storage happens here.
  const savedJournal = JSON.parse(JSON.stringify(journal));
  const savedSnapshot = JSON.parse(JSON.stringify(replayJournal(supportJourney, journal)));
  const restored = replayJournal(supportJourney, savedJournal, savedSnapshot);
  const repeated = recordAction(supportJourney, savedJournal, actions[3]);
  if (repeated.reason !== "REPLAY_REUSED" || repeated.journal.actions.length !== 4) {
    throw Error("Duplicate ID was not safely reconciled");
  }

  return { state: restored.at, acceptedActions: savedJournal.actions.length,
    transitions: restored.trail.length, blockedAttempt: denied.reason,
    originalIdRetry: repeated.reason, restored: true, externalWrites: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(JSON.stringify(runRecordExample(), null, 2) + "\n");
}
