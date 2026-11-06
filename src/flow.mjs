// Original, dependency-free educational state-transition toolkit.
// Never use a client-side transition as an authorization or durable audit decision.
export class FlowFault extends Error {
  constructor(message) { super(message); this.name = "FlowFault"; }
}
const id = x => typeof x === "string" && /^[a-z][a-z0-9_]{0,39}$/.test(x);
const plain = x => x !== null && typeof x === "object" &&
  !Array.isArray(x) && [Object.prototype, null].includes(Object.getPrototypeOf(x));
const own = (x, key) => Object.prototype.hasOwnProperty.call(x, key);
const onlyKeys = (x, allowed) => plain(x) &&
  Object.keys(x).every(key => allowed.includes(key));

function checkValues(values) {
  if (!plain(values) || Object.keys(values).length > 40) throw new FlowFault("Invalid field map");
  for (const [name, value] of Object.entries(values)) {
    if (!id(name) || !["string", "boolean", "number"].includes(typeof value) ||
      (typeof value === "string" && value.length > 500) ||
      (typeof value === "number" && !Number.isFinite(value)))
      throw new FlowFault("Invalid field value");
  }
}
export function inspectMachine(machine) {
  if (!onlyKeys(machine, ["start", "nodes"]) || !plain(machine.nodes) || !id(machine.start) ||
    !own(machine.nodes, machine.start) || !Object.keys(machine.nodes).length ||
    Object.keys(machine.nodes).length > 32) throw new FlowFault("Invalid workflow definition");
  for (const [name, edges] of Object.entries(machine.nodes)) {
    if (!id(name) || !plain(edges)) throw new FlowFault("Invalid workflow node");
    for (const [event, rule] of Object.entries(edges)) {
      if (!id(event) || !onlyKeys(rule, ["to", "require"]) ||
        !id(rule.to) || !own(machine.nodes, rule.to))
        throw new FlowFault("Unknown transition destination");
      if (own(rule, "require")) {
        const check = rule.require;
        if (!onlyKeys(check, ["field", "equals", "nonempty"]) || !id(check.field) ||
          (own(check, "equals") === own(check, "nonempty")) ||
          (own(check, "nonempty") && check.nonempty !== true) ||
          (own(check, "equals") && !["string", "boolean", "number"].includes(typeof check.equals)) ||
          (typeof check.equals === "number" && !Number.isFinite(check.equals)))
          throw new FlowFault("Invalid transition guard");
      }
    }
  }
  return true;
}
export function begin(machine, fields = {}) {
  inspectMachine(machine);
  checkValues(fields);
  return { at: machine.start, fields: { ...fields }, trail: [] };
}
export function inspectSnapshot(machine, snapshot) {
  inspectMachine(machine);
  if (!onlyKeys(snapshot, ["at", "fields", "trail"]) || !id(snapshot.at) ||
    !Array.isArray(snapshot.trail) ||
    snapshot.trail.length > 500) throw new FlowFault("Invalid workflow snapshot");
  checkValues(snapshot.fields);
  let cursor = machine.start;
  for (let i = 0; i < snapshot.trail.length; i++) {
    if (!own(snapshot.trail, i)) throw new FlowFault("Sparse history");
    const item = snapshot.trail[i];
    if (!onlyKeys(item, ["n", "from", "event", "to"]) ||
      item.n !== i + 1 || item.from !== cursor ||
      !id(item.event) || !id(item.to) || !own(machine.nodes[cursor], item.event) ||
      machine.nodes[cursor][item.event].to !== item.to)
      throw new FlowFault("History does not match machine");
    cursor = item.to;
  }
  if (cursor !== snapshot.at) throw new FlowFault("Snapshot state mismatch");
  return true;
}
export function editFields(machine, snapshot, patch) {
  inspectSnapshot(machine, snapshot);
  checkValues(patch);
  const fields = { ...snapshot.fields, ...patch };
  checkValues(fields);
  return { at: snapshot.at, fields, trail: [...snapshot.trail] };
}
export function advance(machine, snapshot, event) {
  inspectSnapshot(machine, snapshot);
  if (!id(event)) throw new FlowFault("Invalid event");
  const rule = machine.nodes[snapshot.at][event];
  if (!own(machine.nodes[snapshot.at], event))
    return { ok: false, reason: "NO_EDGE", snapshot };
  if (own(rule, "require")) {
    const condition = rule.require;
    const value = snapshot.fields[condition.field];
    const permitted = own(snapshot.fields, condition.field) &&
      (own(condition, "equals") ? Object.is(value, condition.equals) :
        String(value).trim().length > 0);
    if (!permitted) return { ok: false, reason: "GUARD_FAILED", snapshot };
  }
  if (snapshot.trail.length >= 500) throw new FlowFault("History limit");
  const item = { n: snapshot.trail.length + 1, from: snapshot.at, event, to: rule.to };
  return { ok: true, reason: "ACCEPTED", snapshot: {
    at: rule.to, fields: { ...snapshot.fields }, trail: [...snapshot.trail, item]
  }};
}
