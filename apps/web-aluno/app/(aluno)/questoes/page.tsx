'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@edro/ui';
import { Button } from '@edro/ui';
import { Badge } from '@edro/ui';
import { DifficultyPill } from '@edro/ui';
import { ProgressBar } from '@/components/ProgressBar';
import { VoiceNote } from '@/components/VoiceNote';
import {
  HelpCircle, Clock, CheckCircle, XCircle, AlertCircle,
  BookOpen, TrendingUp, Award, Filter, Volume2
} from 'lucide-react';
import { getCurrentUser } from '@/lib/api';
import { playTts } from '@/lib/tts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

interface Question {
  id: string;
  discipline: string;
  topic: string;
  question_text: string;
  alternatives: Array<{
    letter: string;
    text: string;
  }>;
  correct_answer: string;
  explanation: string;
  exam_board: string;
  difficulty: number;
  tags: string[];
}

export default function QuestoesPage() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<Array<{ correct: boolean }>>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [voiceNote, setVoiceNote] = useState('');

    const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answerResult, setAnswerResult] = useState<{
    isCorrect: boolean;
    correctAnswer: string;
    explanation?: string;
  } | null>(null);
  const [questionStartedAt, setQuestionStartedAt] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const loadQuestions = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = typeof window !== 'undefined'
          ? localStorage.getItem('token') || localStorage.getItem('edro_token')
          : null;
        const storedEditalId = typeof window !== 'undefined'
          ? localStorage.getItem('edro_selected_edital')
          : null;
        const url = new URL(`${API_URL}/api/questions`);
        url.searchParams.set('status', 'active');
        url.searchParams.set('limit', '20');
        if (storedEditalId) {
          url.searchParams.set('editalId', storedEditalId);
        }
        const res = await fetch(url.toString(), {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const payload = await res.json();
        if (!res.ok || !payload.success) {
          throw new Error(payload?.error || 'Erro ao carregar questoes');
        }
        if (active) {
          setQuestions(payload.data?.questions || []);
        }
      } catch (err) {
        console.error('Erro ao carregar questoes:', err);
        if (active) {
          setError('Nao foi possivel carregar as questoes. Tente novamente.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadQuestions();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (questions.length === 0) return;
    setQuestionStartedAt(Date.now());
    setAnswerResult(null);
  }, [currentQuestion, questions.length]);

  const question = questions[currentQuestion];
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
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <Card className="p-6 text-center">
          <p className="text-gray-600">Carregando questoes...</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <Card className="p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro ao carregar</h2>
          <p className="text-gray-600">{error}</p>
        </Card>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <Card className="p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Sem questoes agora</h2>
          <p className="text-gray-600">Volte mais tarde para novos desafios.</p>
        </Card>
      </div>
    );
  }

  const correctAnswer = answerResult?.correctAnswer || question.correct_answer;
  const isCorrect = answerResult?.isCorrect ?? (selectedAnswer === correctAnswer);
  const totalQuestions = questions.length;
  const correctAnswers = answers.filter(a => a.correct).length;
  const accuracy = answers.length > 0 ? (correctAnswers / answers.length) * 100 : 0;

  const handleAnswer = (letter: string) => {
    if (showResult) return;
    setSelectedAnswer(letter);
  };

    const handleSubmit = async () => {
    if (!selectedAnswer) return;
    if (!question) return;

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
      const token = typeof window !== 'undefined'
        ? localStorage.getItem('token') || localStorage.getItem('edro_token')
        : null;
      const res = await fetch(`${API_URL}/api/questions/${question.id}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userId,
          selectedAnswer,
          timeSpent: timeSpentSeconds,
        }),
      });

      const payload = await res.json();
      if (!res.ok || !payload.success) {
        throw new Error(payload?.error || 'Erro ao registrar resposta');
      }

      const result = payload.data;
      setAnswerResult({
        isCorrect: result.isCorrect,
        correctAnswer: result.correctAnswer,
        explanation: result.explanation || question.explanation,
      });
      setShowResult(true);
      setAnswers((prev) => [...prev, { correct: result.isCorrect }]);
    } catch (err) {
      console.error('Erro ao registrar resposta:', err);
      setError('Nao foi possivel registrar sua resposta.');
    }
  };


  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setAnswerResult(null);
    }
  };

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
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <HelpCircle className="w-8 h-8 text-primary-600" />
              <span>Banco de Questões</span>
            </h1>
            <p className="text-gray-600 mt-1">
              Pratique com questões de concursos anteriores
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => setFilterOpen(!filterOpen)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={handleTts}
              disabled={!ttsText || ttsLoading}
            >
              <Volume2 className="w-4 h-4 mr-2" />
              {ttsLoading ? 'Carregando' : 'Ouvir'}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card padding="md" className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Questão</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                {currentQuestion + 1}/{totalQuestions}
              </p>
            </div>
            <BookOpen className="w-10 h-10 text-blue-600 opacity-80" />
          </div>
        </Card>

        <Card padding="md" className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Acertos</p>
              <p className="text-2xl font-bold text-green-900 mt-1">
                {correctAnswers}/{answers.length}
              </p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-600 opacity-80" />
          </div>
        </Card>

        <Card padding="md" className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Taxa</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">
                {answers.length > 0 ? accuracy.toFixed(0) : '--'}%
              </p>
            </div>
            <TrendingUp className="w-10 h-10 text-purple-600 opacity-80" />
          </div>
        </Card>

        <Card padding="md" className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">Dificuldade</p>
              <p className="text-2xl font-bold text-orange-900 mt-1">
                <DifficultyPill level={question.difficulty} showLabel={false} />
              </p>
            </div>
            <Award className="w-10 h-10 text-orange-600 opacity-80" />
          </div>
        </Card>
      </div>

      {/* Progress */}
      <Card className="mb-6">
        <ProgressBar
          value={currentQuestion + 1}
          max={totalQuestions}
          label="Progresso"
          showPercentage
          color="primary"
          size="md"
        />
      </Card>

      {/* Question Card */}
      <Card className="mb-6">
        {/* Question Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b">
          <div className="flex items-center space-x-3">
            <Badge variant="primary">{question.exam_board}</Badge>
            <Badge variant="gray">{question.discipline}</Badge>
            <Badge variant="gray">{question.topic}</Badge>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>3 min</span>
          </div>
        </div>

        {/* Question Text */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 leading-relaxed">
            {question.question_text}
          </h2>
        </div>

        {/* Alternatives */}
        <div className="space-y-3 mb-6">
          {question.alternatives.map((alt) => {
            const isSelected = selectedAnswer === alt.letter;
            const isCorrectAnswer = alt.letter === correctAnswer;
            
            let borderColor = 'border-gray-300';
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
                onClick={() => handleAnswer(alt.letter)}
                disabled={showResult}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${borderColor} ${bgColor} ${
                  !showResult ? 'hover:border-primary-400 cursor-pointer' : 'cursor-default'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold flex-shrink-0 ${
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
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                  )}
                  {showResult && isSelected && !isCorrect && (
                    <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Actions */}
        {!showResult ? (
          <Button
            variant="primary"
            size="lg"
            onClick={handleSubmit}
            disabled={!selectedAnswer}
            className="w-full"
          >
            Responder
          </Button>
        ) : (
          <div className="space-y-4">
            {/* Result */}
            <Card
              padding="md"
              className={isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}
            >
              <div className="flex items-start space-x-3">
                {isCorrect ? (
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                )}
                <div className="flex-1">
                  <h3 className={`font-bold mb-2 ${isCorrect ? 'text-green-900' : 'text-red-900'}`}>
                    {isCorrect ? '✅ Resposta Correta!' : '❌ Resposta Incorreta'}
                  </h3>
                  <div className={`flex items-start space-x-2 ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p className="text-sm leading-relaxed">
                      {answerResult?.explanation || question.explanation}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Next Button */}
            <Button
              variant="primary"
              size="lg"
              onClick={handleNext}
              className="w-full"
              disabled={currentQuestion >= questions.length - 1}
            >
              {currentQuestion < questions.length - 1 ? (
                <>Próxima Questão →</>
              ) : (
                <>✓ Finalizar</>
              )}
            </Button>
          </div>
        )}
      </Card>

      <div className="mt-6">
        <VoiceNote
          value={voiceNote}
          onChange={setVoiceNote}
          label="Rascunho por voz"
          helper="Grave seu raciocinio ou um resumo da questao."
          placeholder="Digite ou grave seu rascunho..."
        />
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {question.tags.map((tag, index) => (
          <Badge key={index} variant="gray" size="sm">
            #{tag}
          </Badge>
        ))}
      </div>
    </div>
  );
}
