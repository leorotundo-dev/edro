'use client';

import { useState } from 'react';
import { useSRSToday, useReviewSRS } from '@/lib/hooks';
import { SRSReviewCard } from '@/components/SRSReviewCard';
import { Card } from '@edro/ui';
import { Button } from '@edro/ui';
import { ProgressBar } from '@/components/ProgressBar';
import { CheckCircle, RotateCcw, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function RevisaoPage() {
  const { data: srsData, isLoading } = useSRSToday();
  const reviewSRS = useReviewSRS();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);

  const cards = srsData?.data || [];
  const currentCard = cards[currentIndex];
  const totalCards = cards.length;
  const hasMore = currentIndex < totalCards - 1;

  const handleReview = async (grade: number) => {
    if (!currentCard) return;

    try {
      await reviewSRS.mutateAsync({
        cardId: currentCard.id,
        grade,
        timeSpent,
      });

      setReviewedCount(prev => prev + 1);

      if (hasMore) {
        setCurrentIndex(prev => prev + 1);
        setTimeSpent(0);
      }
    } catch (error) {
      console.error('Erro ao revisar:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Estado: Sem revisões
  if (totalCards === 0) {
    return (
      <div className="container mx-auto px-6 py-16">
        <Card className="max-w-2xl mx-auto text-center" padding="lg">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Tudo em dia! 🎉
          </h1>
          
          <p className="text-lg text-gray-600 mb-8">
            Você não tem nenhuma revisão pendente no momento.
          </p>

          <div className="space-y-3">
            <Link href="/dashboard">
              <Button variant="primary" fullWidth>
                Voltar ao Dashboard
              </Button>
            </Link>
            
            <Link href="/estudo">
              <Button variant="outline" fullWidth>
                Estudar Novos Conteúdos
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Estado: Todas revisões completadas
  if (!hasMore && reviewedCount === totalCards) {
    return (
      <div className="container mx-auto px-6 py-16">
        <Card className="max-w-2xl mx-auto text-center" padding="lg">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Revisões Completadas! 🎉
          </h1>
          
          <p className="text-lg text-gray-600 mb-4">
            Você completou {totalCards} {totalCards === 1 ? 'revisão' : 'revisões'}.
          </p>

          <div className="bg-blue-50 rounded-lg p-6 mb-8">
            <TrendingUp className="w-8 h-8 text-blue-600 mx-auto mb-3" />
            <p className="text-sm text-blue-900">
              Continue revisando regularmente para manter o conhecimento fresco!
            </p>
          </div>

          <div className="space-y-3">
            <Link href="/dashboard">
              <Button variant="primary" fullWidth>
                Voltar ao Dashboard
              </Button>
            </Link>
            
            <Button
              onClick={() => {
                setCurrentIndex(0);
                setReviewedCount(0);
              }}
              variant="outline"
              fullWidth
              className="flex items-center justify-center space-x-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Revisar Novamente</span>
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
        <div className="mb-8 max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
            <RotateCcw className="w-8 h-8 mr-3 text-primary-600" />
            Revisão SRS
          </h1>
          <p className="text-gray-600">
            {totalCards} {totalCards === 1 ? 'card' : 'cards'} para revisar hoje
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8 max-w-3xl mx-auto">
          <Card>
            <ProgressBar
              value={reviewedCount}
              max={totalCards}
              label={`Progresso: ${reviewedCount}/${totalCards}`}
              showPercentage
              color="primary"
              size="lg"
            />
          </Card>
        </div>

        {/* Review Card */}
        {currentCard && (
          <SRSReviewCard
            card={currentCard}
            onReview={handleReview}
            isReviewing={reviewSRS.isPending}
          />
        )}

        {/* Navigation Hint */}
        <div className="mt-6 text-center text-sm text-gray-600 max-w-3xl mx-auto">
          <p>
            {hasMore 
              ? `Ainda restam ${totalCards - currentIndex - 1} cards após este`
              : 'Este é o último card!'
            }
          </p>
        </div>
      </div>
    </div>
  );
}
