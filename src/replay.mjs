// Reconstruct a fictional UI journey from edits and accepted events.
// This replay checks historical guards against recorded inputs, unlike the
// structure-only snapshot inspection. It cannot authenticate log provenance.
import { isDeepStrictEqual } from "node:util";
import { begin, editFields, advance, inspectMachine, inspectSnapshot, FlowFault } from "./flow.mjs";

const plain = value => value !== null && typeof value === "object" &&
  !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));

const exactKeys = (value, allowed) => plain(value) &&
  Object.keys(value).length === allowed.length &&
  allowed.every(key => Object.prototype.hasOwnProperty.call(value, key));

const identifier = value => typeof value === "string" && /^[a-z][a-z0-9_]{0,39}$/.test(value);

/**
 * Replay a strictly shaped JSON journal through the same guarded state machine.
 *
 * Journal: {version:1, initial:{...}, actions:[{kind:"edit",patch:{...}},
 *                                          {kind:"event",event:"submit"}]}
 * An optional expected snapshot must agree with the reconstructed fields, state
 * and trail. Rejection does not modify journal, machine or expected snapshot.
 *
 * Do not treat this as authenticated logging or as permission to act on a
 * server. Attackers who control the journal can still construct another
 * internally consistent journey.
 */
export function replayJournal(machine, journal, expectedSnapshot) {
  inspectMachine(machine);
  if (!exactKeys(journal, ["version", "initial", "actions"]) ||
      journal.version !== 1 || !plain(journal.initial) ||
      !Array.isArray(journal.actions) || journal.actions.length > 500) {
    throw new FlowFault("Invalid replay journal");
  }
  let snapshot = begin(machine, journal.initial);
  for (let i = 0; i < journal.actions.length; i++) {
    if (!Object.prototype.hasOwnProperty.call(journal.actions, i)) {
      throw new FlowFault("Sparse replay history");
    }
    const action = journal.actions[i];
    if (!plain(action)) throw new FlowFault("Invalid replay action");
    if (action.kind === "edit") {
      if (!exactKeys(action, ["kind", "patch"])) throw new FlowFault("Invalid field edit");
      snapshot = editFields(machine, snapshot, action.patch);
    } else if (action.kind === "event") {
      if (!exactKeys(action, ["kind", "event"]) || !identifier(action.event)) {
        throw new FlowFault("Invalid replay event");
      }
      const result = advance(machine, snapshot, action.event);
      if (!result.ok) throw new FlowFault("Rejected transition in replay: " + result.reason);
      snapshot = result.snapshot;
    } else {
      throw new FlowFault("Unknown replay action");
    }
  }
  inspectSnapshot(machine, snapshot);
  if (expectedSnapshot !== undefined) {
    inspectSnapshot(machine, expectedSnapshot);
    if (!isDeepStrictEqual(snapshot, expectedSnapshot)) {
      throw new FlowFault("Replay does not match expected snapshot");
    }
  }
  return snapshot;
}
