import { createJournal, recordAction } from "../src/record.mjs";
import { replayJournal } from "../src/replay.mjs";

// Deliberately fictional. Reuse the exact library API—there is no mock engine,
// server request, private workflow, authentication or trading functionality.
const machine = {
  start: "new",
  nodes: {
    new: { send: { to: "triage", require: { field: "subject", nonempty: true } } },
    triage: {
      approve: { to: "resolved", require: { field: "approved", equals: true } },
      revise: { to: "new" },
    },
    resolved: {},
  },
};

const byId = id => document.getElementById(id);
const subject = byId("subject");
const approved = byId("approved");
const status = byId("status");
const source = byId("journal");
const restoreInput = byId("restore-input");

let journal = createJournal(machine, { subject: "", approved: false });
let snapshot = replayJournal(machine, journal);
let counter = 0;

function display(message, error = false) {
  status.textContent = message;
  status.dataset.kind = error ? "error" : "ok";
  byId("state").textContent = snapshot.at;
  byId("operations").textContent = String(journal.actions.length);
  byId("transitions").textContent = String(snapshot.trail.length);
  source.value = JSON.stringify(journal, null, 2);
  const states = ["new", "triage", "resolved"];
  for (const stateName of states) {
    const marker = byId("step-" + stateName);
    marker.dataset.active = stateName === snapshot.at ? "true" : "false";
    if (stateName === snapshot.at) marker.setAttribute("aria-current", "step");
    else marker.removeAttribute("aria-current");
  }
  const done = snapshot.at === "resolved";
  byId("send").disabled = snapshot.at !== "new";
  byId("approve-event").disabled = snapshot.at !== "triage";
  byId("revise").disabled = snapshot.at !== "triage";
  byId("save-subject").disabled = done;
  byId("save-approved").disabled = done;
}

function record(instruction) {
  try {
    const result = recordAction(machine, journal, instruction, snapshot);
    if (result.ok) {
      journal = result.journal;
      snapshot = result.snapshot;
      display(result.reason === "REPLAY_REUSED"
        ? "The existing recorded operation was reused."
        : "Accepted: " + (instruction.event ?? "field edit") + ". The journal was updated.");
    } else {
      display("Denied: " + result.reason + ". No event was recorded.", true);
    }
  } catch (error) {
    // Report a generic local validation error, never raw untrusted input.
    display("Invalid or stale operation. The journal is unchanged.", true);
  }
}

function action(kind, value) {
  const id = "op_" + (++counter);
  record(kind === "event"
    ? { id, kind, event: value }
    : { id, kind, patch: value });
}

byId("save-subject").addEventListener("click", () =>
  action("edit", { subject: subject.value }));
byId("save-approved").addEventListener("click", () =>
  action("edit", { approved: approved.checked }));
byId("send").addEventListener("click", () => action("event", "send"));
byId("approve-event").addEventListener("click", () => action("event", "approve"));
byId("revise").addEventListener("click", () => action("event", "revise"));

byId("reset").addEventListener("click", () => {
  journal = createJournal(machine, { subject: "", approved: false });
  snapshot = replayJournal(machine, journal);
  counter = 0;
  subject.value = "";
  approved.checked = false;
  restoreInput.value = "";
  display("The fictional journey has been reset.");
});

byId("restore").addEventListener("click", () => {
  try {
    if (!restoreInput.value.trim() || restoreInput.value.length > 48_000)
      throw new Error("INVALID_BOUNDED_JSON");
    const candidate = JSON.parse(restoreInput.value);
    const restored = replayJournal(machine, candidate);
    // The library validates all recorded guards. Still not an authenticity
    // check: an attacker can supply a different internally consistent journal.
    const serializable = JSON.parse(JSON.stringify(candidate));
    journal = serializable;
    snapshot = restored;
    counter = candidate.actions.reduce((max, entry) => {
      const match = /^op_(\d+)$/.exec(entry.id ?? "");
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    subject.value = String(snapshot.fields.subject ?? "");
    approved.checked = snapshot.fields.approved === true;
    display("Restored: local guard checks passed. Source authenticity is not verified.");
  } catch (error) {
    display("Restore rejected: invalid JSON, malformed history or denied guard.", true);
  }
});

byId("copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(source.value);
    display("Synthetic journal copied to clipboard.");
  } catch (error) {
    source.focus();
    source.select();
    display("Automatic copy unavailable. Journal selected for manual copy.", true);
  }
});

display("Start by saving a fictional subject, or try Send with an empty subject.");
