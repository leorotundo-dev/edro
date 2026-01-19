'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card } from '@edro/ui';
import { Loader2, Mic, Square } from 'lucide-react';
import { readStoredAccessibility } from '@/lib/accessibility';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type VoiceNoteProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  helper?: string;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  className?: string;
};

const readToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token') || localStorage.getItem('edro_token');
};

const toBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('file_read_failed'));
    reader.readAsDataURL(blob);
  });

export function VoiceNote({
  value,
  onChange,
  label = 'Anotacao por voz',
  helper = 'Dite um resumo rapido para guardar junto do estudo.',
  placeholder = 'Digite ou grave sua anotacao...',
  rows = 4,
  disabled,
  className,
}: VoiceNoteProps) {
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
  }, []);

  const resetRecorder = useCallback(() => {
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  }, []);

  const handleTranscription = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const base64 = await toBase64(blob);
      const payload = base64.split(',')[1] || '';
      if (!payload) {
        throw new Error('empty_audio');
      }
      const stored = readStoredAccessibility();
      const token = readToken();
      const res = await fetch(`${API_URL}/api/accessibility/stt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          audioBase64: payload,
          idioma: stored?.stt_language || 'pt-BR',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'stt_failed');
      }
      const transcript = data?.data?.transcript || '';
      if (transcript) {
        const next = value ? `${value}\n${transcript}` : transcript;
        onChange(next);
        setLastTranscript(transcript);
      }
    } catch (err) {
      setError('Nao foi possivel transcrever o audio.');
    } finally {
      setLoading(false);
      setRecording(false);
      stopStream();
      resetRecorder();
    }
  }, [onChange, resetRecorder, stopStream, value]);

  const startRecording = useCallback(async () => {
    if (recording || loading || disabled) return;
    if (typeof window === 'undefined') return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Microfone indisponivel neste navegador.');
      return;
    }

    try {
      setError(null);
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
      recorder.onstop = () => {
        void handleTranscription();
      };
      recorder.start();
      setRecording(true);
    } catch (err) {
      setError('Nao foi possivel acessar o microfone.');
      stopStream();
      resetRecorder();
    }
  }, [disabled, handleTranscription, loading, recording, resetRecorder, stopStream]);

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    if (mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  useEffect(() => {
    return () => {
      stopStream();
      resetRecorder();
    };
  }, [resetRecorder, stopStream]);

  return (
    <Card className={className} padding="md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          {helper && <p className="text-xs text-slate-500">{helper}</p>}
        </div>
        <Button
          size="sm"
          variant={recording ? 'danger' : 'outline'}
          onClick={recording ? stopRecording : startRecording}
          disabled={loading || disabled}
          className="flex items-center gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {loading ? 'Transcrevendo' : recording ? 'Parar' : 'Gravar'}
        </Button>
      </div>

      <textarea
        className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-label={label}
      />

      {lastTranscript && (
        <p className="mt-2 text-xs text-slate-500">Ultima transcricao: {lastTranscript}</p>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </Card>
  );
}
