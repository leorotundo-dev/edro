/** Returns a human-readable "time ago" string for a nullable ISO timestamp. */
export function fmtAgo(ts: string | null | undefined): string {
  if (!ts) return 'nunca';
  const h = Math.round((Date.now() - new Date(ts).getTime()) / 3_600_000);
  if (h < 1) return 'agora';
  if (h < 24) return `há ${h}h`;
  return `há ${Math.round(h / 24)}d`;
}
