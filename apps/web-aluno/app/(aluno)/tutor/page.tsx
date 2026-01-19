'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Button, Badge } from '@edro/ui';
import { Sparkles, Send, BookOpen, Wand2, CheckCircle, Mic, Square } from 'lucide-react';
import { getCurrentUser } from '@/lib/api';
import { readStoredAccessibility } from '@/lib/accessibility';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type Discipline = {
  id: string;
  name: string;
};

type TutorAnswer = {
  answer: string;
  drop?: any;
};

const responseFormats = [
  { value: 'curta', label: 'Curta' },
  { value: 'longa', label: 'Longa' },
  { value: 'analogia', label: 'Analogia' },
  { value: 'historia', label: 'Historia' },
  { value: 'mapa_mental', label: 'Mapa mental' },
];

const simplifyMethods = [
  { value: '1-3-1', label: '1-3-1' },
  { value: 'contraste', label: 'Contraste' },
  { value: 'analogia', label: 'Analogia' },
  { value: 'historia', label: 'Historia' },
  { value: 'mapa_mental', label: 'Mapa mental' },
];

export default function TutorPage() {
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [message, setMessage] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [dropResult, setDropResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [disciplineId, setDisciplineId] = useState('');
  const [topic, setTopic] = useState('');
  const [banca, setBanca] = useState('');
  const [learningStyle, setLearningStyle] = useState('');
  const [responseFormat, setResponseFormat] = useState('curta');
  const [mode, setMode] = useState<'padrao' | 'turbo' | 'calmo'>('padrao');
  const [useRag, setUseRag] = useState(true);
  const [includeErrors, setIncludeErrors] = useState(true);

  const [foco, setFoco] = useState('');
  const [energia, setEnergia] = useState('');
  const [humor, setHumor] = useState('');
  const [ansiedade, setAnsiedade] = useState(false);
  const [frustracao, setFrustracao] = useState(false);

  const [createDropEnabled, setCreateDropEnabled] = useState(false);
  const [dropTitle, setDropTitle] = useState('');
  const [dropDifficulty, setDropDifficulty] = useState('1');

  const [simplifyText, setSimplifyText] = useState('');
  const [simplifyMethod, setSimplifyMethod] = useState('1-3-1');
  const [simplifyLevel, setSimplifyLevel] = useState('');
  const [simplifyStyle, setSimplifyStyle] = useState('');
  const [simplifyResult, setSimplifyResult] = useState<string | null>(null);
  const [simplifyLoading, setSimplifyLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [sttLoading, setSttLoading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);

  const authHeaders = useMemo(() => {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('token') || localStorage.getItem('edro_token')
      : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    } as Record<string, string>;
  }, []);

  useEffect(() => {
    const loadDisciplines = async () => {
      try {
        const res = await fetch(`${API_URL}/api/disciplines`);
        const payload = await res.json();
        if (res.ok && payload?.disciplines) {
          setDisciplines(payload.disciplines);
        }
      } catch (err) {
        console.warn('Falha ao carregar disciplinas:', err);
      }
    };
    void loadDisciplines();
  }, []);

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
          const stored = readStoredAccessibility();
          const res = await fetch(`${API_URL}/api/accessibility/stt`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
              audioBase64: payload,
              idioma: stored?.stt_language || 'pt-BR',
            }),
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data?.error || 'stt_failed');
          }
          const transcript = data?.data?.transcript || '';
          if (transcript) {
            setMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
          }
        } catch (err) {
          setError('Nao foi possivel transcrever o audio.');
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
      setError('Nao foi possivel acessar o microfone.');
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      }
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;
    if (mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleTutorSubmit = async () => {
    if (!message.trim()) {
      setError('Digite sua pergunta.');
      return;
    }

    if (createDropEnabled && !disciplineId) {
      setError('Selecione uma disciplina para criar o drop.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setAnswer(null);
      setDropResult(null);

      const user = getCurrentUser();
      const userId = user?.id || user?.sub;

      const disciplineName = disciplines.find((disc) => disc.id === disciplineId)?.name;
      const payload: any = {
        user_id: userId,
        message,
        discipline: disciplineName || undefined,
        topic: topic || undefined,
        banca: banca || undefined,
        mode,
        response_format: responseFormat,
        use_rag: useRag,
        include_recent_errors: includeErrors,
        learning_style: learningStyle || undefined,
      };

      const cognitive: any = {};
      if (foco) cognitive.foco = Number(foco);
      if (energia) cognitive.energia = Number(energia);
      if (Object.keys(cognitive).length > 0) {
        payload.cognitive = cognitive;
      }

      const emotional: any = {};
      if (humor) emotional.humor = Number(humor);
      if (ansiedade) emotional.ansiedade = true;
      if (frustracao) emotional.frustracao = true;
      if (Object.keys(emotional).length > 0) {
        payload.emotional = emotional;
      }

      if (createDropEnabled) {
        payload.create_drop = {
          enabled: true,
          discipline_id: disciplineId,
          title: dropTitle || undefined,
          difficulty: Number(dropDifficulty) || 1,
          topic_code: topic || undefined,
        };
      }

      const res = await fetch(`${API_URL}/api/tutor/session`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || 'Erro ao falar com o tutor');
      }

      const response: TutorAnswer = data.data;
      setAnswer(response.answer);
      if (response.drop) {
        setDropResult(response.drop);
      }
    } catch (err) {
      console.error('Erro ao falar com tutor:', err);
      setError('Nao foi possivel gerar a resposta.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDrop = async () => {
    if (!answer) return;
    if (!disciplineId) {
      setError('Selecione uma disciplina para criar o drop.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/api/tutor/to-drop`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          discipline_id: disciplineId,
          title: dropTitle || topic || 'Drop do tutor',
          content: answer,
          difficulty: Number(dropDifficulty) || 1,
          topic_code: topic || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || 'Erro ao criar drop');
      }
      setDropResult(data.data);
    } catch (err) {
      console.error('Erro ao criar drop:', err);
      setError('Nao foi possivel criar o drop.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimplify = async () => {
    if (!simplifyText.trim()) {
      setError('Digite o texto para simplificar.');
      return;
    }
    try {
      setSimplifyLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/api/simplify`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          texto: simplifyText,
          metodo: simplifyMethod,
          banca: banca || undefined,
          nivel: simplifyLevel || undefined,
          estilo: simplifyStyle || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || 'Erro ao simplificar');
      }
      setSimplifyResult(data.data?.texto || '');
    } catch (err) {
      console.error('Erro ao simplificar:', err);
      setError('Nao foi possivel simplificar o texto.');
    } finally {
      setSimplifyLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl space-y-6">
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary-600" />
              Tutor IA
            </h1>
            <p className="text-gray-600 mt-1">
              Respostas personalizadas, com opcao de criar drops para revisar depois.
            </p>
          </div>
          {dropResult && (
            <Badge variant="primary" size="sm">
              Drop criado
            </Badge>
          )}
        </div>
      </Card>

      {error && (
        <Card className="p-4 border border-red-200 bg-red-50 text-red-700">
          {error}
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-semibold text-gray-700">Pergunta</label>
              <Button
                variant="outline"
                size="sm"
                onClick={recording ? stopRecording : startRecording}
                disabled={sttLoading}
                className="flex items-center gap-2"
              >
                {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {recording ? 'Parar' : sttLoading ? 'Transcrevendo' : 'Gravar'}
              </Button>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full h-32 border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Digite sua duvida..."
            />
            {sttLoading && (
              <p className="text-xs text-gray-500">Transcrevendo audio...</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Disciplina</label>
              <select
                value={disciplineId}
                onChange={(e) => setDisciplineId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">Selecione</option>
                {disciplines.map((disc) => (
                  <option key={disc.id} value={disc.id}>{disc.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Topico</label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Ex: Direitos fundamentais"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Banca</label>
              <input
                value={banca}
                onChange={(e) => setBanca(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Ex: CEBRASPE"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Estilo</label>
              <input
                value={learningStyle}
                onChange={(e) => setLearningStyle(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Visual, auditivo, logico..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Formato</label>
              <select
                value={responseFormat}
                onChange={(e) => setResponseFormat(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                {responseFormats.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Modo</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'padrao' | 'turbo' | 'calmo')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="padrao">Padrao</option>
                <option value="turbo">Turbo</option>
                <option value="calmo">Calmo</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Foco (0-10)</label>
              <input
                type="number"
                min="0"
                max="10"
                value={foco}
                onChange={(e) => setFoco(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Energia (0-10)</label>
              <input
                type="number"
                min="0"
                max="10"
                value={energia}
                onChange={(e) => setEnergia(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Humor (0-10)</label>
              <input
                type="number"
                min="0"
                max="10"
                value={humor}
                onChange={(e) => setHumor(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={ansiedade} onChange={(e) => setAnsiedade(e.target.checked)} />
              Ansiedade
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={frustracao} onChange={(e) => setFrustracao(e.target.checked)} />
              Frustracao
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={useRag} onChange={(e) => setUseRag(e.target.checked)} />
              Usar RAG
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={includeErrors} onChange={(e) => setIncludeErrors(e.target.checked)} />
              Considerar erros recentes
            </label>
          </div>

          <Card className="p-4 border border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-gray-700">Criar drop</div>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={createDropEnabled}
                  onChange={(e) => setCreateDropEnabled(e.target.checked)}
                />
                Ativar
              </label>
            </div>
            {createDropEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={dropTitle}
                  onChange={(e) => setDropTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Titulo do drop"
                />
                <select
                  value={dropDifficulty}
                  onChange={(e) => setDropDifficulty(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  {[1, 2, 3, 4, 5].map((level) => (
                    <option key={level} value={String(level)}>
                      Dificuldade {level}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </Card>

          <Button variant="primary" size="md" onClick={handleTutorSubmit} disabled={loading}>
            <Send className="w-4 h-4 mr-2" />
            {loading ? 'Gerando...' : 'Enviar'}
          </Button>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary-600" />
              Resposta
            </h2>
            {dropResult && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                Drop criado
              </div>
            )}
          </div>

          {!answer && (
            <div className="text-sm text-gray-500">
              Envie sua pergunta para receber a resposta do tutor.
            </div>
          )}

          {answer && (
            <div className="space-y-4">
              <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                {answer}
              </div>
              {!dropResult && (
                <Button variant="outline" size="sm" onClick={handleCreateDrop}>
                  Criar drop desta resposta
                </Button>
              )}
              {dropResult && (
                <div className="text-sm text-gray-600">
                  Drop criado em rascunho. Aguarde aprovacao no admin.
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">Simplificar conteudo</h2>
        </div>
        <textarea
          value={simplifyText}
          onChange={(e) => setSimplifyText(e.target.value)}
          className="w-full h-28 border border-gray-300 rounded-lg px-3 py-2"
          placeholder="Cole o texto para simplificar"
        />
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={simplifyMethod}
            onChange={(e) => setSimplifyMethod(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          >
            {simplifyMethods.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <select
            value={simplifyLevel}
            onChange={(e) => setSimplifyLevel(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">Nivel</option>
            <option value="N1">N1</option>
            <option value="N2">N2</option>
            <option value="N3">N3</option>
            <option value="N4">N4</option>
            <option value="N5">N5</option>
          </select>
          <input
            value={simplifyStyle}
            onChange={(e) => setSimplifyStyle(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
            placeholder="Estilo cognitivo"
          />
          <Button variant="primary" size="sm" onClick={handleSimplify} disabled={simplifyLoading}>
            {simplifyLoading ? 'Simplificando...' : 'Simplificar'}
          </Button>
        </div>
        {simplifyResult && (
          <Card className="p-4 bg-slate-50 border border-slate-200">
            <div className="text-sm text-gray-600 mb-2">Resultado</div>
            <div className="whitespace-pre-wrap text-gray-800">{simplifyResult}</div>
          </Card>
        )}
      </Card>
    </div>
  );
}
