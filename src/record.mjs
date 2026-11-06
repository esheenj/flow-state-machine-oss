// Original, dependency-free, local-only journal recorder for UI prototypes.
// Recording does NOT authenticate who initiated an event or grant authority.
import { isDeepStrictEqual } from "node:util";
import { begin, editFields, advance, inspectSnapshot, FlowFault } from "./flow.mjs";
import { replayJournal, inspectJournalAction } from "./replay.mjs";

/**
 * Start an empty versioned journal with independently copied field values.
 * The caller's object can be changed later without altering this journal.
 */
export function createJournal(machine, initial = {}) {
  begin(machine, initial); // Validate the machine and primitive-only field map.
  return { version: 1, initial: structuredClone(initial), actions: [] };
}

/**
 * Append one validated edit or accepted event, immutably.
 *
 * Instruction: {id:"stable_operation_id",kind:"edit",patch:{...}} or
 *              {id:"stable_operation_id",kind:"event",event:"submit"}.
 *
 * The stable ID is mandatory. Retrying the *same* ID with identical contents
 * yields REPLAY_REUSED without a duplicate entry. Reusing that ID for changed
 * contents fails closed. Legacy journals without IDs can still be extended.
 *
 * expectedBefore optionally enforces a current-state precondition on new
 * operations. For a previously recorded ID, recovery uses the original ID and
 * checks its actual stored contents, even if an old expectedBefore is stale.
 *
 * Denied transitions return the EXACT ORIGINAL journal object and do not
 * append any action. Successful operations return a detached new journal.
 * Snapshot reflects the latest journal state, including on REPLAY_REUSED.
 *
 * This is local state management, not tamper-proof storage, a remotely executed
 * task, a permission check or an externally authenticated event receipt.
 */
export function recordAction(machine, journal, instruction, expectedBefore) {
  inspectJournalAction(instruction, true);
  const current = replayJournal(machine, journal); // Validates all existing history.
  const previous = journal.actions.find(action => action.id === instruction.id);
  if (previous !== undefined) {
    if (!isDeepStrictEqual(previous, instruction)) {
      throw new FlowFault("Conflicting replay operation ID");
    }
    return { ok: true, reason: "REPLAY_REUSED", journal, snapshot: current };
  }
  if (expectedBefore !== undefined) {
    inspectSnapshot(machine, expectedBefore);
    if (!isDeepStrictEqual(current, expectedBefore)) {
      throw new FlowFault("Recorder precondition does not match current snapshot");
    }
  }
  if (journal.actions.length >= 500) throw new FlowFault("Journal action limit");

  let next;
  if (instruction.kind === "edit") {
    next = editFields(machine, current, instruction.patch);
  } else {
    const outcome = advance(machine, current, instruction.event);
    if (!outcome.ok) {
      return { ok: false, reason: outcome.reason, journal, snapshot: current };
    }
    next = outcome.snapshot;
  }
  // Make a detached JSON-compatible journal: neither a later mutation to the
  // original nor to the instruction can change the new recorded history.
  const updated = structuredClone({
    version: 1,
    initial: journal.initial,
    actions: [...journal.actions, instruction],
  });
  // A different journal would be rejected by exactly the same replay logic.
  // Keep the pure reconstructed snapshot from the accepted event/edit.
  return { ok: true, reason: "RECORDED", journal: updated, snapshot: next };
}
