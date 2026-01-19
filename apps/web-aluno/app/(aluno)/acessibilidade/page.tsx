'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Button, Badge, StatCard } from '@edro/ui';
import { Volume2, Mic, Save, Sparkles, Shield, Headphones, Loader2, Trophy } from 'lucide-react';
import { applyAccessibilitySettings, storeAccessibilitySettings } from '@/lib/accessibility';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type AccessibilitySettings = {
  mode: 'default' | 'tdah' | 'dislexia' | 'baixa-visao' | 'ansiedade';
  tts_voice?: string | null;
  tts_speed?: number;
  stt_language?: string;
  font_size?: 'sm' | 'md' | 'lg' | 'xl';
  contrast_mode?: 'normal' | 'high';
  motion_reduced?: boolean;
};

type ModePreset = {
  id: string;
  label: string;
  features: string[];
};

type GamificationProfile = {
  xp_total: number;
  level: number;
  next_level_xp: number;
  xp_into_level: number;
  max_streak: number;
  badges: Array<{ id: string; title: string }>;
};

const defaultSettings: AccessibilitySettings = {
  mode: 'default',
  font_size: 'md',
  contrast_mode: 'normal',
  motion_reduced: false,
  tts_speed: 1,
  stt_language: 'pt-BR',
};

async function authFetch(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('token') || localStorage.getItem('edro_token')
    : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    throw new Error(`Erro ${res.status}`);
  }
  return res.json();
}

export default function AcessibilidadePage() {
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings);
  const [modes, setModes] = useState<ModePreset[]>([]);
  const [gamification, setGamification] = useState<GamificationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsText, setTtsText] = useState('Bem-vindo ao Edro! Vamos estudar?');
  const [message, setMessage] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [sttLoading, setSttLoading] = useState(false);
  const [sttTranscript, setSttTranscript] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);

  const badges = useMemo(() => gamification?.badges || [], [gamification]);

  useEffect(() => {
    setMounted(true);
    async function bootstrap() {
      try {
        const [modesRes, settingsRes, gamRes] = await Promise.allSettled([
          fetch(`${API_URL}/api/accessibility/modes`).then(r => r.json()),
          authFetch('/api/accessibility/settings'),
          authFetch('/api/gamification/profile'),
        ]);

        if (modesRes.status === 'fulfilled') {
          setModes(modesRes.value.data?.modos || []);
        }
        if (settingsRes.status === 'fulfilled') {
          const nextSettings = settingsRes.value.data || defaultSettings;
          setSettings(nextSettings);
          storeAccessibilitySettings(nextSettings);
          applyAccessibilitySettings(nextSettings);
        }
        if (gamRes.status === 'fulfilled') {
          setGamification(gamRes.value.data);
        }
      } catch (err) {
        setMessage('Não foi possível carregar acessibilidade agora.');
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, []);

  async function saveSettings() {
    try {
      setSaving(true);
      await authFetch('/api/accessibility/settings', {
        method: 'POST',
        body: JSON.stringify(settings),
      });
      storeAccessibilitySettings(settings);
      applyAccessibilitySettings(settings);
      setMessage('Preferências salvas.');
    } catch (err) {
      setMessage('Erro ao salvar preferências.');
    } finally {
      setSaving(false);
    }
  }

  async function previewTTS() {
    try {
      setTtsLoading(true);
      const res = await authFetch('/api/accessibility/tts', {
        method: 'POST',
        body: JSON.stringify({
          texto: ttsText,
          voz: settings.tts_voice,
          velocidade: settings.tts_speed,
          idioma: settings.stt_language,
        }),
      });
      const audioUrl = `data:${res.data.mime};base64,${res.data.base64}`;
      const audio = new Audio(audioUrl);
      audio.play();
    } catch (err) {
      setMessage('Erro ao gerar áudio.');
    } finally {
      setTtsLoading(false);
    }
  }

  const toBase64 = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('file_read_failed'));
      reader.readAsDataURL(blob);
    });

  const startRecording = async () => {
    if (recording || sttLoading) return;
    if (typeof window === 'undefined') return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setMessage('Microfone indisponivel neste navegador.');
      return;
    }

    try {
      setMessage(null);
      setSttTranscript('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setRecording(false);
        try {
          setSttLoading(true);
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const base64 = await toBase64(blob);
          const payload = base64.split(',')[1] || '';
          if (!payload) {
            throw new Error('empty_audio');
          }
          const res = await authFetch('/api/accessibility/stt', {
            method: 'POST',
            body: JSON.stringify({
              audioBase64: payload,
              idioma: settings.stt_language,
            }),
          });
          setSttTranscript(res?.data?.transcript || '');
        } catch (err) {
          setMessage('Erro ao transcrever audio.');
        } finally {
          setSttLoading(false);
          if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach((track) => track.stop());
            audioStreamRef.current = null;
          }
          mediaRecorderRef.current = null;
          audioChunksRef.current = [];
        }
      };

      recorder.start();
      setRecording(true);
    } catch (err) {
      setMessage('Nao foi possivel acessar o microfone.');
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      }
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;
    if (mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      }
    };
  }, []);

  if (!mounted) {
    return null;
  }

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center gap-3 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando acessibilidade...
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <Headphones className="h-7 w-7 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Acessibilidade & Áudio</h1>
          <p className="text-slate-600">Configure TTS/STT e modos de foco/cognição.</p>
        </div>
      </div>

      {message && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatCard
          label="Nível"
          value={gamification?.level ?? 1}
          helper={`${gamification?.xp_into_level ?? 0}/${gamification?.next_level_xp ?? 500} XP`}
          icon={Shield}
          tone="indigo"
        />
        <StatCard
          label="XP Total"
          value={gamification?.xp_total ?? 0}
          helper="Progresso gamificado"
          icon={Sparkles}
          tone="purple"
        />
        <StatCard
          label="Maior Streak"
          value={gamification?.max_streak ?? 0}
          helper="Dias seguidos"
          icon={Trophy}
          tone="orange"
        />
      </div>

      {badges.length > 0 && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-3">Badges</h3>
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <Badge key={b.id} variant="gray">{b.title}</Badge>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary-600" />
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Modos de Acessibilidade</h3>
              <p className="text-sm text-slate-600">Escolha um modo pronto ou personalize.</p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700">Modo</label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={settings.mode}
              onChange={(e) => setSettings((s) => ({ ...s, mode: e.target.value as AccessibilitySettings['mode'] }))}
            >
              {['default', 'tdah', 'dislexia', 'baixa-visao', 'ansiedade'].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700">Fonte</label>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={settings.font_size}
                  onChange={(e) => setSettings((s) => ({ ...s, font_size: e.target.value as any }))}
                >
                  <option value="sm">Pequena</option>
                  <option value="md">Média</option>
                  <option value="lg">Grande</option>
                  <option value="xl">Extra</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Contraste</label>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={settings.contrast_mode}
                  onChange={(e) => setSettings((s) => ({ ...s, contrast_mode: e.target.value as any }))}
                >
                  <option value="normal">Normal</option>
                  <option value="high">Alto</option>
                </select>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.motion_reduced}
                onChange={(e) => setSettings((s) => ({ ...s, motion_reduced: e.target.checked }))}
              />
              Reduzir animações
            </label>
          </div>

          <div className="flex gap-3">
            <Button onClick={saveSettings} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <Save className="h-4 w-4 mr-2" />
              Salvar preferências
            </Button>
          </div>
        </Card>

        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Volume2 className="h-5 w-5 text-primary-600" />
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Texto para Fala (TTS)</h3>
              <p className="text-sm text-slate-600">Ouça rapidamente qualquer conteúdo.</p>
            </div>
          </div>

          <label className="text-sm font-medium text-slate-700">Texto</label>
          <textarea
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[100px]"
            value={ttsText}
            onChange={(e) => setTtsText(e.target.value)}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Voz</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="alloy (default)"
                value={settings.tts_voice || ''}
                onChange={(e) => setSettings((s) => ({ ...s, tts_voice: e.target.value || null }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Velocidade</label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="2"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={settings.tts_speed || 1}
                onChange={(e) => setSettings((s) => ({ ...s, tts_speed: parseFloat(e.target.value) }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Idioma (STT)</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={settings.stt_language || 'pt-BR'}
                onChange={(e) => setSettings((s) => ({ ...s, stt_language: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={previewTTS} disabled={ttsLoading}>
              {ttsLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <Headphones className="h-4 w-4 mr-2" />
              Ouvir
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Mic className="h-5 w-5 text-primary-600" />
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Comandos de Voz (STT)</h3>
            <p className="text-sm text-slate-600">Envie áudio base64 e receba a transcrição.</p>
          </div>
        </div>
        <p className="text-sm text-slate-600">
          A API `POST /api/accessibility/stt` aceita `audioBase64` e retorna `transcript`. Integre aqui gravando áudio do microfone e enviando o base64.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant={recording ? 'danger' : 'primary'}
            size="sm"
            onClick={recording ? stopRecording : startRecording}
            disabled={sttLoading}
          >
            <Mic className="h-4 w-4" />
            {recording ? 'Parar gravacao' : 'Gravar audio'}
          </Button>
          {recording && (
            <span className="text-xs text-slate-500">Gravando...</span>
          )}
          {sttLoading && (
            <span className="text-xs text-slate-500">Transcrevendo...</span>
          )}
        </div>
        {sttTranscript && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            {sttTranscript}
          </div>
        )}
      </Card>
    </div>
  );
}
