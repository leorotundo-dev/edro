'use client';

import { useMemo, useState } from 'react';
import { SRSCard } from '@/types';
import { Card, Button, Badge } from '@edro/ui';
import { ThumbsUp, ThumbsDown, Meh, Volume2 } from 'lucide-react';
import { playTts } from '@/lib/tts';
import { VoiceNote } from '@/components/VoiceNote';

interface SRSReviewCardProps {
  card: SRSCard;
  onReview: (grade: number) => void;
  isReviewing: boolean;
}

const gradeOptions = [
  { grade: 1, label: 'Nao lembrei', icon: ThumbsDown, variant: 'danger' },
  { grade: 2, label: 'Dificil', icon: Meh, variant: 'secondary' },
  { grade: 3, label: 'Bom', icon: ThumbsUp, variant: 'primary' },
  { grade: 4, label: 'Facil', icon: ThumbsUp, variant: 'success' },
  { grade: 5, label: 'Muito facil', icon: ThumbsUp, variant: 'success' }
] as const;

export function SRSReviewCard({ card, onReview, isReviewing }: SRSReviewCardProps) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [voiceNote, setVoiceNote] = useState('');

  const ttsText = useMemo(() => {
    const drop = card.drop;
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
  }, [card.drop]);

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
    <Card className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Badge variant="primary">Revisao SRS</Badge>
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
          <div className="text-sm text-gray-600">
            Repeticao: {card.repetition + 1}  Intervalo: {card.interval} dias
          </div>
        </div>
      </div>

      <div className="mb-8">
        <div className="bg-gray-50 rounded-lg p-6 mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Voce lembra deste conteudo?</h3>
          <p className="text-gray-600">Tente relembrar antes de revelar a resposta</p>
        </div>

        {!showAnswer ? (
          <div className="text-center py-8">
            <Button onClick={() => setShowAnswer(true)} variant="primary" size="lg">
              Mostrar Resposta
            </Button>
          </div>
        ) : (
          <div className="bg-blue-50 rounded-lg p-6 border-2 border-blue-200">
            <div className="prose max-w-none">
              <p className="text-gray-800 whitespace-pre-wrap">
                {ttsText || 'Conteudo indisponivel para este card.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {showAnswer && (
        <div className="border-t pt-6">
          <h4 className="font-semibold text-gray-900 mb-4 text-center">Quao facil foi lembrar?</h4>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {gradeOptions.map(({ grade, label, icon: Icon, variant }) => (
              <Button
                key={grade}
                onClick={() => onReview(grade)}
                variant={variant}
                disabled={isReviewing}
                className="flex flex-col items-center py-4 h-auto"
              >
                <Icon className="w-6 h-6 mb-2" />
                <span className="text-xs font-semibold">{label}</span>
                <span className="text-xs text-gray-500 mt-1">({grade})</span>
              </Button>
            ))}
          </div>

          <VoiceNote
            value={voiceNote}
            onChange={setVoiceNote}
            label="Anotacao por voz"
            helper="Dite um resumo rapido do que voce lembrou."
            placeholder="Digite ou grave sua anotacao..."
            className="mt-6"
          />

          <p className="text-xs text-center text-gray-600 mt-4">
            Sua avaliacao ajusta automaticamente o intervalo de revisao
          </p>
        </div>
      )}
    </Card>
  );
}
