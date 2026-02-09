import { query } from '../db';
import { SocialListeningService } from './SocialListeningService';
import { env } from '../env';

let lastRunAt = 0;

function isEnabled() {
  const flag = process.env.SOCIAL_LISTENING_ENABLED;
  if (flag === undefined) return true;
  return flag === 'true' || flag === '1';
}

function hasDataApiConfig() {
  const base = env.SOCIAL_DATA_API_URL;
  const key = env.SOCIAL_DATA_API_KEY;
  return Boolean(base && key);
}

export async function runSocialListeningWorkerOnce() {
  if (!isEnabled()) return;
  if (!hasDataApiConfig()) return;

  const intervalMs = Number(process.env.SOCIAL_LISTENING_INTERVAL_MS || 6 * 60 * 60 * 1000);
  const now = Date.now();
  if (now - lastRunAt < intervalMs) return;
  lastRunAt = now;

  const limit = Math.min(Number(process.env.SOCIAL_LISTENING_COLLECT_LIMIT || 20), 100);

  const { rows } = await query<{ id: string }>('SELECT id FROM tenants');
  for (const tenant of rows) {
    try {
      const service = new SocialListeningService(tenant.id);
      await service.collectAll({ limit });
    } catch (error) {
      console.error('social_listening_worker', error);
    }

    // Also collect from tracked LinkedIn profiles (Proxycurl)
    try {
      const service = new SocialListeningService(tenant.id);
      await service.collectProfilePosts({ limit: 10 });
    } catch (error) {
      console.error('social_listening_worker_profiles', error);
    }
  }
}
