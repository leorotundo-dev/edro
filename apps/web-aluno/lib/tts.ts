import { readStoredAccessibility } from './accessibility';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type TtsOptions = {
  voice?: string | null;
  speed?: number;
  language?: string;
  token?: string | null;
};

function resolveTtsOptions(options?: TtsOptions) {
  const stored = readStoredAccessibility();
  return {
    voice: options?.voice ?? stored?.tts_voice ?? undefined,
    speed: options?.speed ?? stored?.tts_speed ?? undefined,
    language: options?.language ?? stored?.stt_language ?? undefined,
  };
}

export async function requestTtsAudio(text: string, options?: TtsOptions) {
  const token =
    options?.token ??
    (typeof window !== 'undefined'
      ? localStorage.getItem('token') || localStorage.getItem('edro_token')
      : null);
  const resolved = resolveTtsOptions(options);

  const res = await fetch(`${API_URL}/api/accessibility/tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      texto: text,
      voz: resolved.voice ?? undefined,
      velocidade: resolved.speed ?? undefined,
      idioma: resolved.language ?? undefined,
    }),
  });

  if (!res.ok) {
    throw new Error('tts_failed');
  }

  const payload = await res.json();
  return {
    mime: payload.data.mime as string,
    base64: payload.data.base64 as string,
    url: `data:${payload.data.mime};base64,${payload.data.base64}`,
  };
}

export async function playTts(text: string, options?: TtsOptions) {
  const audioPayload = await requestTtsAudio(text, options);
  const audio = new Audio(audioPayload.url);
  await audio.play();
  return audioPayload;
}
