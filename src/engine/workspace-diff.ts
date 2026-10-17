/**
 * Count changed workspace paths using both snapshots' key sets.
 * Deletions must count too; iterating only the final workspace silently omits them.
 */
export function countChangedFiles(before: Record<string, string>, after: Record<string, string>): number {
  const paths = new Set([...Object.keys(before), ...Object.keys(after)]);
  let changed = 0;
  for (const path of paths) {
    const existedBefore = Object.prototype.hasOwnProperty.call(before, path);
    const existsAfter = Object.prototype.hasOwnProperty.call(after, path);
    if (existedBefore !== existsAfter || before[path] !== after[path]) changed++;
  }
  return changed;
}
