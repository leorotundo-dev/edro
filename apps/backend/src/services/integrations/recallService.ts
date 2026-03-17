import { env } from '../../env';

type RecallBotResponse = {
  id: string;
  status?: { code?: string; sub_code?: string; message?: string } | string;
  // Recall v1 API: status as an array of status_changes
  status_changes?: Array<{ code?: string; sub_code?: string | null; message?: string | null; created_at?: string }>;
  recordings?: Array<{
    id?: string;
    // Recall v1: transcript available via media_shortcuts.transcript.data.download_url
    media_shortcuts?: {
      transcript?: { data?: { download_url?: string } };
      video_mixed?: { data?: { download_url?: string } };
    };
    [key: string]: any;
  }>;
};

function recallBaseUrl(version: 'v1' | 'v2' = 'v1'): string {
  const region = env.RECALL_REGION || 'us-west-2';
  return `https://${region}.recall.ai/api/${version}`;
}

function recallHeaders(): Record<string, string> {
  if (!env.RECALL_API_KEY) throw new Error('RECALL_API_KEY não configurada');
  return {
    Authorization: `Token ${env.RECALL_API_KEY}`,
    accept: 'application/json',
    'content-type': 'application/json',
  };
}

export function isRecallConfigured(): boolean {
  return Boolean(env.RECALL_API_KEY);
}

export async function createRecallBot(params: {
  meetingUrl: string;
  joinAt: string;
  botName: string;
  platform?: string;
  metadata: Record<string, string>;
}): Promise<RecallBotResponse> {
  const body: Record<string, any> = {
    meeting_url: params.meetingUrl,
    join_at: params.joinAt,
    bot_name: params.botName,
    metadata: params.metadata,
    recording_config: {
      transcript: {
        provider: {
          recallai_streaming: {
            mode: 'prioritize_accuracy',
          },
        },
      },
    },
  };

  if ((params.platform === 'meet' || params.meetingUrl.includes('meet.google.com')) && env.RECALL_GOOGLE_LOGIN_GROUP_ID) {
    body.google_meet = {
      google_login_group_id: env.RECALL_GOOGLE_LOGIN_GROUP_ID,
    };
  }

  const res = await fetch(`${recallBaseUrl()}/bot/`, {
    method: 'POST',
    headers: recallHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Recall create bot failed (${res.status}): ${err.slice(0, 300)}`);
  }

  return res.json() as Promise<RecallBotResponse>;
}

export async function getRecallBot(botId: string): Promise<RecallBotResponse> {
  const res = await fetch(`${recallBaseUrl()}/bot/${botId}/`, {
    headers: recallHeaders(),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Recall retrieve bot failed (${res.status}): ${err.slice(0, 300)}`);
  }

  return res.json() as Promise<RecallBotResponse>;
}

export async function getRecallBotTranscript(botId: string): Promise<string> {
  // Recall API flow:
  // 1. GET /api/v1/bot/{id}/ → recordings[].media_shortcuts.transcript.data.download_url
  // 2. Fetch that pre-signed URL (no auth) → JSON array of speaker segments
  // Each segment: { participant: { name }, words: [{ text }] }
  const bot = await getRecallBot(botId);

  for (const rec of bot.recordings ?? []) {
    const downloadUrl = rec.media_shortcuts?.transcript?.data?.download_url;
    if (!downloadUrl) continue;

    const res = await fetch(downloadUrl); // pre-signed URL — no auth headers
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(`Recall transcript download failed (${res.status}): ${err.slice(0, 200)}`);
    }
    const data = await res.json();
    const text = transcriptPayloadToText(data);
    if (text) return text;
  }

  throw new Error('Recall transcript not available: recordings have no transcript download_url');
}

export function getRecallBotStatus(bot: RecallBotResponse): string {
  if (typeof bot.status === 'string') return bot.status.toLowerCase();
  if (bot.status?.code) return String(bot.status.code).toLowerCase();
  // Recall v1 API returns status history in status_changes; last item is current
  if (Array.isArray(bot.status_changes) && bot.status_changes.length > 0) {
    const last = bot.status_changes[bot.status_changes.length - 1];
    if (last?.code) return String(last.code).toLowerCase();
  }
  return '';
}

function transcriptPayloadToText(payload: any): string {
  const items =
    arrayOrNull(payload) ??
    arrayOrNull(payload?.results) ??
    arrayOrNull(payload?.data) ??
    arrayOrNull(payload?.transcript) ??
    arrayOrNull(payload?.utterances);

  if (items) {
    const lines = items
      .map((entry) => {
        const text = extractTranscriptLine(entry);
        return text.trim();
      })
      .filter(Boolean);

    if (lines.length) return lines.join('\n');
  }

  if (typeof payload?.text === 'string') return payload.text.trim();
  if (Array.isArray(payload?.words)) {
    return payload.words
      .map((word: any) => String(word?.text || '').trim())
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  return '';
}

function extractTranscriptLine(entry: any): string {
  if (typeof entry === 'string') return entry;

  const words = Array.isArray(entry?.words)
    ? entry.words.map((word: any) => String(word?.text || '').trim()).filter(Boolean).join(' ')
    : '';

  const text = String(
    entry?.text ??
    entry?.transcript ??
    entry?.content ??
    entry?.sentence ??
    words,
  ).trim();

  const speaker = String(
    entry?.speaker ??
    entry?.speaker_name ??
    entry?.participant?.name ??
    '',
  ).trim();

  if (!text) return '';
  return speaker ? `${speaker}: ${text}` : text;
}

function arrayOrNull(value: any): any[] | null {
  return Array.isArray(value) ? value : null;
}
