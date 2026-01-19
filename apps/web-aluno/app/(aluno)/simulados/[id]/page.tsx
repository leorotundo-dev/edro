'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Badge, DifficultyPill } from '@edro/ui';
import { ProgressBar } from '@/components/ProgressBar';
import { VoiceNote } from '@/components/VoiceNote';
import { getCurrentUser } from '@/lib/api';
import { playTts } from '@/lib/tts';
import {
  Clock,
  CheckCircle,
  XCircle,
  PlayCircle,
  BarChart,
  Volume2
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

interface SimuladoListItem {
  id: string;
  title: string;
  description: string;
  exam_board: string;
  total_questions: number;
  duration_minutes?: number | null;
  difficulty: number;
  topics: string[];
  status: 'not_started' | 'in_progress' | 'completed';
  progress?: number;
  executionId?: string | null;
  lastAttempt?: {
    resultId?: string;
    date: string;
    score: number;
    correctAnswers: number;
    timeSpent: number;
  } | null;
}

interface Question {
  id: string;
  question_text: string;
  alternatives: Array<{
    letter: string;
    text: string;
  }>;
  correct_answer: string;
  explanation: string;
  exam_board?: string;
  discipline?: string;
  topic?: string;
  difficulty?: number;
}

interface ExecutionPayload {
  executionId: string;
  simulado: any;
  currentQuestion: Question | null;
  adaptiveState: any;
  mode?: string;
  timerSeconds?: number | null;
  questionTimerSeconds?: number | null;
  timeRemainingSeconds?: number | null;
  progress?: { current: number; total: number };
}

export default function SimuladoDetailPage() {
  const params = useParams();
  const simuladoId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simulado, setSimulado] = useState<SimuladoListItem | null>(null);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answerResult, setAnswerResult] = useState<{ isCorrect: boolean; correctAnswer: string; explanation?: string } | null>(null);
  const [questionStartedAt, setQuestionStartedAt] = useState<number | null>(null);
  const [finalResult, setFinalResult] = useState<any | null>(null);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [voiceNote, setVoiceNote] = useState('');

  const authHeaders = useMemo(() => {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('token') || localStorage.getItem('edro_token')
      : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    } as Record<string, string>;
  }, []);

  const loadResult = useCallback(async (resultId: string) => {
    const res = await fetch(`${API_URL}/api/simulados/results/${resultId}`, {
      headers: authHeaders,
    });
    const payload = await res.json();
    if (!res.ok || !payload.success) {
      throw new Error(payload?.error || 'Erro ao carregar resultado');
    }
    setFinalResult(payload.data);
  }, [authHeaders]);

  const loadExecution = useCallback(async (execId: string) => {
    const res = await fetch(`${API_URL}/api/simulados/executions/${execId}`, {
      headers: authHeaders,
    });
    const payload = await res.json();
    if (!res.ok || !payload.success) {
      throw new Error(payload?.error || 'Erro ao carregar execucao');
    }
    const data = payload.data as ExecutionPayload;
    setExecutionId(data.executionId);
    setQuestion(data.currentQuestion || null);
    setProgress(data.progress || null);
    setSimulado((prev) => prev || (data.simulado as SimuladoListItem));
    setQuestionStartedAt(Date.now());
    setShowResult(false);
    setAnswerResult(null);
  }, [authHeaders]);

  const startExecution = useCallback(async (userId: string) => {
    const res = await fetch(`${API_URL}/api/simulados/${simuladoId}/start`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ userId }),
    });
    const payload = await res.json();
    if (!res.ok || !payload.success) {
      throw new Error(payload?.error || 'Erro ao iniciar simulado');
    }
    const data = payload.data as ExecutionPayload;
    setExecutionId(data.executionId);
    setQuestion(data.currentQuestion || null);
    setProgress(data.progress || { current: 1, total: data.simulado?.total_questions || 0 });
    setSimulado((data.simulado || null) as SimuladoListItem | null);
    setQuestionStartedAt(Date.now());
  }, [authHeaders, simuladoId]);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        setLoading(true);
        setError(null);
        const user = getCurrentUser();
        const userId = user?.id || user?.sub;
        if (!userId) {
          throw new Error('Usuario nao autenticado');
        }

        const listRes = await fetch(`${API_URL}/api/users/${userId}/simulados`, {
          headers: authHeaders,
        });
        const listPayload = await listRes.json();
        if (!listRes.ok || !listPayload.success) {
          throw new Error(listPayload?.error || 'Erro ao carregar simulados');
        }

        const item = (listPayload.data || []).find((s: SimuladoListItem) => s.id === simuladoId) || null;
        if (!item) {
          throw new Error('Simulado nao encontrado');
        }

        if (!active) return;

        setSimulado(item);

        if (item.status === 'completed' && item.lastAttempt?.resultId) {
          await loadResult(item.lastAttempt.resultId);
          return;
        }

        if (item.status === 'in_progress' && item.executionId) {
          await loadExecution(item.executionId);
          return;
        }

        await startExecution(userId);
      } catch (err) {
        console.error('Erro ao carregar simulado:', err);
        if (active) {
          setError('Nao foi possivel carregar o simulado.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void bootstrap();
    return () => {
      active = false;
    };
  }, [authHeaders, loadExecution, loadResult, simuladoId, startExecution]);

  const handleAnswerSelect = (letter: string) => {
    if (showResult) return;
    setSelectedAnswer(letter);
  };

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || !question || !executionId) return;
    const user = getCurrentUser();
    const userId = user?.id || user?.sub;
    if (!userId) {
      setError('Usuario nao autenticado.');
      return;
    }

    const timeSpentSeconds = questionStartedAt
      ? Math.max(1, Math.round((Date.now() - questionStartedAt) / 1000))
      : 0;

    try {
      const res = await fetch(`${API_URL}/api/simulados/executions/${executionId}/answer`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          questionId: question.id,
          selectedAnswer,
          timeSpent: timeSpentSeconds,
        }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) {
        throw new Error(payload?.error || 'Erro ao registrar resposta');
      }

      const data = payload.data;
      setAnswerResult({
        isCorrect: data.isCorrect,
        correctAnswer: data.correctAnswer,
        explanation: data.explanation || question.explanation,
      });
      setShowResult(true);
      setProgress(data.progress || progress);

      if (data.isCompleted) {
        const finishRes = await fetch(`${API_URL}/api/simulados/executions/${executionId}/finish`, {
          method: 'POST',
          headers: authHeaders,
        });
        const finishPayload = await finishRes.json();
        if (!finishRes.ok || !finishPayload.success) {
          throw new Error(finishPayload?.error || 'Erro ao finalizar simulado');
        }
        setFinalResult(finishPayload.data);
        return;
      }

      setQuestion(data.nextQuestion || null);
      setSelectedAnswer(null);
      setShowResult(false);
      setAnswerResult(null);
      setQuestionStartedAt(Date.now());
    } catch (err) {
      console.error('Erro ao responder:', err);
      setError('Nao foi possivel registrar sua resposta.');
    }
  };

  const summary = finalResult?.analysis?.summary || finalResult?.summary || null;
  const analysis = finalResult?.analysis || null;
  const ttsText = useMemo(() => {
    if (!question) return '';
    const alternatives = question.alternatives.map((alt) => `${alt.letter}: ${alt.text}`);
    const parts = [
      question.question_text,
      ...alternatives,
      showResult ? (answerResult?.explanation || question.explanation) : '',
    ].filter(Boolean);
    return parts.join('\n');
  }, [question, showResult, answerResult?.explanation]);

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-5xl">
        <Card className="p-6 text-center">
          <p className="text-gray-600">Carregando simulado...</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-5xl">
        <Card className="p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro</h2>
          <p className="text-gray-600">{error}</p>
          <Link href="/simulados" className="inline-flex mt-4">
            <Button variant="outline" size="sm">Voltar</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (!simulado) {
    return null;
  }

  if (finalResult && summary) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-5xl">
        <Card className="p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Resultado do Simulado</h1>
          <p className="text-gray-600">{simulado.title}</p>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card padding="md">
            <p className="text-sm text-gray-500">Nota</p>
            <p className="text-2xl font-bold text-gray-900">{summary.score}%</p>
          </Card>
          <Card padding="md">
            <p className="text-sm text-gray-500">Acertos</p>
            <p className="text-2xl font-bold text-gray-900">
              {summary.correct_answers}/{summary.total_questions}
            </p>
          </Card>
          <Card padding="md">
            <p className="text-sm text-gray-500">Tempo</p>
            <p className="text-2xl font-bold text-gray-900">{Math.round(summary.total_time_seconds / 60)} min</p>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo</h2>
          <div className="text-sm text-gray-600 space-y-2">
            <p>Precisao: {summary.accuracy}%</p>
            {analysis?.weaknesses && (
              <p>Pontos fracos: {analysis.weaknesses.map((w: any) => w.topic).join(', ')}</p>
            )}
          </div>
        </Card>

        <div className="mt-6">
          <VoiceNote
            value={voiceNote}
            onChange={setVoiceNote}
            label="Reflexao por voz"
            helper="Registre o que precisa reforcar apos o simulado."
            placeholder="Digite ou grave sua reflexao..."
          />
        </div>
      </div>
    );
  }

  const correctAnswer = answerResult?.correctAnswer || question?.correct_answer;
  const isCorrect = answerResult?.isCorrect ?? (selectedAnswer === correctAnswer);

  const handleTts = async () => {
    if (!ttsText) return;
    try {
      setTtsLoading(true);
      await playTts(ttsText);
    } catch (err) {
      console.error('Erro ao gerar audio:', err);
    } finally {
      setTtsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl">
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <PlayCircle className="w-6 h-6 text-primary-600" />
              {simulado.title}
            </h1>
            <p className="text-gray-600 mt-1">{simulado.description}</p>
          </div>
          <Badge variant="primary">{simulado.exam_board}</Badge>
        </div>
      </Card>

      {progress && (
        <Card className="mb-6">
          <ProgressBar
            value={progress.current}
            max={progress.total}
            label="Progresso"
            showPercentage
            color="primary"
            size="md"
          />
        </Card>
      )}

      {question && (
        <div className="mt-6">
          <VoiceNote
            value={voiceNote}
            onChange={setVoiceNote}
            label="Rascunho por voz"
            helper="Grave seu raciocinio durante o simulado."
            placeholder="Digite ou grave seu rascunho..."
          />
        </div>
      )}

      {question && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {question.exam_board && <Badge variant="primary">{question.exam_board}</Badge>}
              {question.discipline && <Badge variant="gray">{question.discipline}</Badge>}
              {question.topic && <Badge variant="gray">{question.topic}</Badge>}
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTts}
                disabled={!ttsText || ttsLoading}
                className="flex items-center gap-2"
              >
                <Volume2 className="w-4 h-4" />
                {ttsLoading ? 'Carregando' : 'Ouvir'}
              </Button>
              <span className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {question.difficulty ? <DifficultyPill level={question.difficulty} showLabel={false} /> : null}
              </span>
            </div>
          </div>

          <h2 className="text-lg font-semibold text-gray-900 mb-4">{question.question_text}</h2>

          <div className="space-y-3 mb-6">
            {question.alternatives.map((alt) => {
              const isSelected = selectedAnswer === alt.letter;
              const isCorrectAnswer = alt.letter === correctAnswer;

              let borderColor = 'border-gray-200';
              let bgColor = 'bg-white';

              if (showResult) {
                if (isCorrectAnswer) {
                  borderColor = 'border-green-500';
                  bgColor = 'bg-green-50';
                } else if (isSelected && !isCorrect) {
                  borderColor = 'border-red-500';
                  bgColor = 'bg-red-50';
                }
              } else if (isSelected) {
                borderColor = 'border-primary-500';
                bgColor = 'bg-primary-50';
              }

              return (
                <button
                  key={alt.letter}
                  onClick={() => handleAnswerSelect(alt.letter)}
                  disabled={showResult}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${borderColor} ${bgColor}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                      showResult && isCorrectAnswer
                        ? 'bg-green-200 text-green-800'
                        : showResult && isSelected && !isCorrect
                        ? 'bg-red-200 text-red-800'
                        : isSelected
                        ? 'bg-primary-200 text-primary-800'
                        : 'bg-gray-200 text-gray-700'
                    }`}>
                      {alt.letter}
                    </div>
                    <p className="flex-1 text-gray-900 pt-1">{alt.text}</p>
                    {showResult && isCorrectAnswer && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                    {showResult && isSelected && !isCorrect && (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {!showResult ? (
            <Button
              variant="primary"
              size="lg"
              onClick={handleSubmitAnswer}
              disabled={!selectedAnswer}
              className="w-full"
            >
              Enviar resposta
            </Button>
          ) : (
            <Card padding="md" className={isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
              <div className="flex items-start gap-3">
                {isCorrect ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
                <div>
                  <h3 className={`font-semibold ${isCorrect ? 'text-green-900' : 'text-red-900'}`}>
                    {isCorrect ? 'Resposta correta' : 'Resposta incorreta'}
                  </h3>
                  <p className="text-sm text-gray-700 mt-2">
                    {answerResult?.explanation || question.explanation}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </Card>
      )}

      {!question && !finalResult && (
        <Card className="p-6 text-center">
          <BarChart className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">Nenhuma questao disponivel.</p>
        </Card>
      )}
    </div>
  );
}
