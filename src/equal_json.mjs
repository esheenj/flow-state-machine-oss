// Portable deep comparison for bounded, JSON-shaped workflow snapshots.
// No node:util or external dependency; suitable for browser ESM and Node.
// It is deliberately NOT a general deep-equality algorithm for Dates, Maps,
// class instances, cyclic graphs, accessors, or other non-JSON data.
const plain = value => value !== null && typeof value === "object" &&
  !Array.isArray(value) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value));

export function equalJSON(left, right) {
  if (Object.is(left, right)) return true;
  if (typeof left !== typeof right || left === null || right === null ||
      typeof left !== "object") return false;
  const arrays = Array.isArray(left) && Array.isArray(right);
  if (!arrays && (!plain(left) || !plain(right) ||
      Object.getPrototypeOf(left) !== Object.getPrototypeOf(right))) return false;
  if (arrays !== (Array.isArray(left) || Array.isArray(right))) return false;
  if (Object.getOwnPropertySymbols(left).length ||
      Object.getOwnPropertySymbols(right).length) return false;
  const leftKeys = Object.keys(left), rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length ||
      (arrays && left.length !== right.length)) return false;
  for (const key of leftKeys) {
    if (!Object.prototype.hasOwnProperty.call(right, key) ||
        !equalJSON(left[key], right[key])) return false;
  }
  return true;
}
