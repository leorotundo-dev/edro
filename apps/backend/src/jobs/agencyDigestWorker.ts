import { generateAndSaveDigest } from '../services/agencyDigestService';

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'edro';

// Daily: runs Mon–Fri at ~7:00 AM
// Weekly: runs Saturday at ~8:00 AM
// The worker is called every 5s by jobsRunner — it checks the hour + day internally.

let lastDailyDate: string | null = null;
let lastWeeklyDate: string | null = null;

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function currentHour(): number {
  return new Date().getHours();
}

function dayOfWeek(): number {
  return new Date().getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
}

export async function runAgencyDigestWorkerOnce(): Promise<void> {
  const today = todayStr();
  const hour = currentHour();
  const dow = dayOfWeek();

  // Weekday digest: Mon–Fri (1–5), at hour 7
  if (dow >= 1 && dow <= 5 && hour === 7 && lastDailyDate !== today) {
    lastDailyDate = today;
    try {
      await generateAndSaveDigest(DEFAULT_TENANT_ID, 'daily');
      console.log('[agencyDigest] daily digest generated for', today);
    } catch (err: any) {
      console.error('[agencyDigest] daily digest error:', err?.message);
    }
  }

  // Weekly digest: Saturday (6), at hour 8
  if (dow === 6 && hour === 8 && lastWeeklyDate !== today) {
    lastWeeklyDate = today;
    try {
      await generateAndSaveDigest(DEFAULT_TENANT_ID, 'weekly');
      console.log('[agencyDigest] weekly digest generated for', today);
    } catch (err: any) {
      console.error('[agencyDigest] weekly digest error:', err?.message);
    }
  }
}
