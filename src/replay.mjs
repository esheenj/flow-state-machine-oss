// Reconstruct a fictional UI journey from edits and accepted events.
// This replay checks historical guards against recorded inputs, unlike the
// structure-only snapshot inspection. It cannot authenticate log provenance.
import { equalJSON } from "./equal_json.mjs";
import { begin, editFields, advance, inspectMachine, inspectSnapshot, FlowFault } from "./flow.mjs";

const plain = value => value !== null && typeof value === "object" &&
  !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));

const exactKeys = (value, allowed) => plain(value) &&
  Object.keys(value).length === allowed.length &&
  allowed.every(key => Object.prototype.hasOwnProperty.call(value, key));

const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const identifier = value => typeof value === "string" && /^[a-z][a-z0-9_]{0,39}$/.test(value);

/** Validate one event/edit shape. Legacy actions may omit the optional ID. */
export function inspectJournalAction(action, requireId = false) {
  if (!plain(action) || !["edit", "event"].includes(action.kind))
    throw new FlowFault("Invalid replay action");
  const required = action.kind === "edit" ? ["kind", "patch"] : ["kind", "event"];
  const hasId = own(action, "id");
  const keys = Object.keys(action);
  if ((requireId && !hasId) || (hasId && !identifier(action.id)) ||
      keys.length !== required.length + Number(hasId) ||
      !required.every(key => own(action, key)) ||
      !keys.every(key => required.includes(key) || key === "id")) {
    throw new FlowFault("Invalid replay action fields");
  }
  if (action.kind === "event" && !identifier(action.event)) {
    throw new FlowFault("Invalid replay event");
  }
  if (action.kind === "edit" && !plain(action.patch)) {
    throw new FlowFault("Invalid field edit");
  }
  return true;
}

/**
 * Replay a strictly shaped JSON journal through the same guarded state machine.
 *
 * Journal: {version:1, initial:{...}, actions:[{kind:"edit",patch:{...}},
 *                                          {kind:"event",event:"submit"}]}
 * Actions may optionally have a unique {id:"original_request_id"}; older
 * journals without IDs continue to work. Duplicate IDs are rejected.
 *
 * An optional expected snapshot must agree with the reconstructed fields,
 * state and trail. Rejection does not modify the caller's objects.
 *
 * Do not treat this as authenticated logging or permission to act on a server.
 * Attackers controlling the journal can create a consistent different history.
 */
export function replayJournal(machine, journal, expectedSnapshot) {
  inspectMachine(machine);
  if (!exactKeys(journal, ["version", "initial", "actions"]) ||
      journal.version !== 1 || !plain(journal.initial) ||
      !Array.isArray(journal.actions) || journal.actions.length > 500) {
    throw new FlowFault("Invalid replay journal");
  }
  let snapshot = begin(machine, journal.initial);
  const seen = new Set();
  for (let i = 0; i < journal.actions.length; i++) {
    if (!own(journal.actions, i)) throw new FlowFault("Sparse replay history");
    const action = journal.actions[i];
    inspectJournalAction(action);
    if (own(action, "id")) {
      if (seen.has(action.id)) throw new FlowFault("Duplicate replay operation ID");
      seen.add(action.id);
    }
    if (action.kind === "edit") {
      snapshot = editFields(machine, snapshot, action.patch);
    } else {
      const result = advance(machine, snapshot, action.event);
      if (!result.ok) throw new FlowFault("Rejected transition in replay: " + result.reason);
      snapshot = result.snapshot;
    }
  }
  inspectSnapshot(machine, snapshot);
  if (expectedSnapshot !== undefined) {
    inspectSnapshot(machine, expectedSnapshot);
    if (!equalJSON(snapshot, expectedSnapshot)) {
      throw new FlowFault("Replay does not match expected snapshot");
    }
  }
  return snapshot;
}
