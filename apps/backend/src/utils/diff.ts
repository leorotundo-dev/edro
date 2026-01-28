export function jsonDiff(before: any, after: any) {
  const diff: Record<string, { from: any; to: any }> = {};
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  for (const key of keys) {
    const left = (before || {})[key];
    const right = (after || {})[key];
    if (JSON.stringify(left) !== JSON.stringify(right)) {
      diff[key] = { from: left, to: right };
    }
  }
  return diff;
}
