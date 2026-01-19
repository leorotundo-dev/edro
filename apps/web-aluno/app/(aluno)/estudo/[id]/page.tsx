'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDrop, useLogLearning, useEnrollInSRS } from '@/lib/hooks';
import { DropViewer } from '@/components/DropViewer';
import { VoiceNote } from '@/components/VoiceNote';
import { Timer } from '@/components/Timer';
import { api, getCurrentUser } from '@/lib/api';
import { Card, Button, Badge } from '@edro/ui';
import { ArrowLeft, CheckCircle, XCircle, BookmarkPlus, Volume2 } from 'lucide-react';
import Link from 'next/link';
import { playTts } from '@/lib/tts';

type RecommendedMnemonic = {
  id: string;
  tecnica?: string;
  texto_principal: string;
  explicacao?: string;
  versoes_alternativas?: string[];
  banca?: string;
};

export default function EstudoPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: dropData, isLoading } = useDrop(params.id);
  const logLearning = useLogLearning();
  const enrollInSRS = useEnrollInSRS();

  const [timeSpent, setTimeSpent] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [voiceNote, setVoiceNote] = useState('');
  const [recommendedMnemonics, setRecommendedMnemonics] = useState<RecommendedMnemonic[]>([]);
  const [mnemonicsLoading, setMnemonicsLoading] = useState(false);
  const [mnemonicsError, setMnemonicsError] = useState<string | null>(null);

  const drop = dropData?.data;
  const tutorMeta = drop?.origin_meta ?? null;
  const tutorMessage = tutorMeta?.source_message ?? null;
  const tutorFormatLabel = tutorMeta?.response_format
    ? String(tutorMeta?.response_format).replace('_', ' ')
    : null;
  const tutorLearningStyle = tutorMeta?.learning_style ?? null;
  const tutorErrorCount = Array.isArray(tutorMeta?.recent_errors) ? tutorMeta.recent_errors.length : 0;
  const topicLabel = drop?.topic_code || drop?.title || 'tópico';

  useEffect(() => {
    let active = true;
    const topicHint = drop?.topic_code || drop?.title;

    if (!topicHint) {
      setRecommendedMnemonics([]);
      setMnemonicsError(null);
      setMnemonicsLoading(false);
      return undefined;
    }

    const loadRecommendations = async () => {
      try {
        setMnemonicsLoading(true);
        setMnemonicsError(null);
        const response = await api.recommendMnemonics(topicHint);
        if (!active) return;
        const results = Array.isArray(response?.data) ? response.data : [];
        setRecommendedMnemonics(results.slice(0, 4));
      } catch (error: any) {
        if (!active) return;
        setMnemonicsError(error?.message || 'Nao foi possivel carregar os mnemonicos recomendados.');
        setRecommendedMnemonics([]);
      } finally {
        if (active) setMnemonicsLoading(false);
      }
    };

    void loadRecommendations();

    return () => {
      active = false;
    };
  }, [drop?.topic_code, drop?.title]);

  const ttsText = useMemo(() => {
    if (!drop) return '';
    const content = drop.drop_text || {};
    const parts = [
      drop.title,
      content.text || drop.content,
      ...(content.examples || []),
      ...(content.hints || []),
      content.explanation || '',
    ].filter(Boolean);
    return parts.join('\n');
  }, [drop]);

  const handleTts = async () => {
    if (!ttsText) return;
    try {
      setTtsLoading(true);
      await playTts(ttsText);
    } catch (error) {
      console.error('Erro ao gerar audio:', error);
    } finally {
      setTtsLoading(false);
    }
  };

  const handleComplete = async (understood: boolean) => {
    try {
      await logLearning.mutateAsync({
        dropId: params.id,
        timeSpent,
        completed: true,
        understood,
      });

      setShowCompletion(true);
    } catch (error) {
      console.error('Erro ao completar drop:', error);
    }
  };

  const handleAddToSRS = async () => {
    try {
      await enrollInSRS.mutateAsync(params.id);
      alert('✅ Adicionado ao SRS com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar ao SRS:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!drop) {
    return (
      <div className="container mx-auto px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Drop não encontrado</h1>
        <Link href="/dashboard">
          <Button variant="primary">Voltar ao Dashboard</Button>
        </Link>
      </div>
    );
  }

  if (showCompletion) {
    return (
      <div className="container mx-auto px-6 py-16">
        <Card className="max-w-2xl mx-auto text-center" padding="lg">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Parabéns! 🎉
          </h1>
          
          <p className="text-lg text-gray-600 mb-8">
            Você completou este drop em {Math.floor(timeSpent / 60)} minutos e {timeSpent % 60} segundos.
          </p>

          <div className="space-y-3">
            <Button
              onClick={() => router.push('/dashboard')}
              variant="primary"
              fullWidth
            >
              Voltar ao Dashboard
            </Button>
            
            <Button
              onClick={handleAddToSRS}
              variant="outline"
              fullWidth
              className="flex items-center justify-center space-x-2"
            >
              <BookmarkPlus className="w-5 h-5" />
              <span>Adicionar ao SRS para Revisar</span>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="flex items-center space-x-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </Button>
          </Link>

          <div className="flex items-center gap-3">
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
            <Timer autoStart onTimeUpdate={setTimeSpent} />
          </div>
        </div>

        {/* Drop Content */}
        <DropViewer drop={drop} />

        {drop.origin === 'tutor' && (
          <Card padding="lg" className="mt-6 border-l-4 border-primary-500 bg-white/90 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-primary-600">Resposta gerada pelo Tutor IA</p>
                <p className="text-base text-gray-900 mt-1">
                  {tutorMessage || 'O tutor respondeu com base no seu estado e histórico.'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant="primary">Tutor</Badge>
                {tutorFormatLabel && (
                  <span className="text-xs uppercase text-gray-500 tracking-wide">
                    {tutorFormatLabel}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-gray-600">
              {tutorLearningStyle && (
                <div className="rounded-lg bg-gray-50 px-3 py-2">
                  Estilo cognitivo: {tutorLearningStyle}
                </div>
              )}
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                {tutorErrorCount > 0
                  ? `${tutorErrorCount} erros recentes usados para reforço`
                  : 'Sem erros recentes no contexto'}
              </div>
            </div>
          </Card>
        )}

        <Card padding="lg" className="mt-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Mnemônicos recomendados</h2>
              <p className="text-sm text-gray-600">
                Técnica inteligente para fixar o {topicLabel}.
              </p>
            </div>
            <Badge size="sm" variant="gray">
              {topicLabel}
            </Badge>
          </div>

          {mnemonicsLoading && (
            <p className="mt-3 text-sm text-gray-500">Buscando mnemônicos relevantes...</p>
          )}
          {mnemonicsError && (
            <p className="mt-3 text-sm text-red-600">{mnemonicsError}</p>
          )}

          {!mnemonicsLoading && recommendedMnemonics.length === 0 && !mnemonicsError && (
            <p className="mt-3 text-sm text-gray-500">
              Nenhum mnemônico específico para este tópico, mas você pode criar o seu.
            </p>
          )}

          {recommendedMnemonics.length > 0 && (
            <ul className="mt-4 space-y-4">
              {recommendedMnemonics.map((mnemonic) => (
                <li key={mnemonic.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    {mnemonic.tecnica && <span>Técnica: {mnemonic.tecnica}</span>}
                    {mnemonic.banca && <span>Banca: {mnemonic.banca}</span>}
                  </div>
                  <p className="mt-2 font-medium text-gray-900">{mnemonic.texto_principal}</p>
                  {mnemonic.explicacao && (
                    <p className="mt-1 text-sm text-gray-700">{mnemonic.explicacao}</p>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex items-center gap-3 text-sm text-gray-600">
            <Link href="/mnemonicos" className="font-semibold text-primary-600">
              Ver todos os mnemônicos
            </Link>
            <span>•</span>
            <Button variant="ghost" size="sm" onClick={() => router.push('/mnemonicos')}>
              Criar o meu próprio
            </Button>
          </div>
        </Card>

        <div className="mt-6 max-w-4xl mx-auto">
          <VoiceNote
            value={voiceNote}
            onChange={setVoiceNote}
            label="Resumo por voz"
            helper="Dite um resumo do drop para revisar depois."
            placeholder="Digite ou grave seu resumo..."
          />
        </div>

        {/* Actions */}
        <div className="mt-8 max-w-4xl mx-auto">
          <Card padding="lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Você entendeu este conteúdo?
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => handleComplete(true)}
                variant="primary"
                size="lg"
                fullWidth
                disabled={logLearning.isPending}
                className="flex items-center justify-center space-x-2"
              >
                <CheckCircle className="w-5 h-5" />
                <span>Sim, entendi!</span>
              </Button>

              <Button
                onClick={() => handleComplete(false)}
                variant="outline"
                size="lg"
                fullWidth
                disabled={logLearning.isPending}
                className="flex items-center justify-center space-x-2"
              >
                <XCircle className="w-5 h-5" />
                <span>Preciso revisar</span>
              </Button>
            </div>

            <p className="text-sm text-gray-600 text-center mt-4">
              Sua resposta nos ajuda a personalizar sua próxima trilha
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
