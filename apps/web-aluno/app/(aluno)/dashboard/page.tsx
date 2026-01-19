'use client';

import Link from 'next/link';
import { useTrailToday, useStats } from '@/lib/hooks';
import { getCurrentUser } from '@/lib/api';
import type { TrailItem } from '@/types';

const formatToday = () =>
  new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
};

const parseAccuracy = (value: unknown) => {
  if (typeof value == 'number') return value;
  if (typeof value == 'string') {
    const normalized = Number(value.replace('%', '').trim());
    return Number.isFinite(normalized) ? normalized : null;
  }
  return null;
};

export default function DashboardPage() {
  const user = getCurrentUser();
  const { data: trailData, isLoading: trailLoading } = useTrailToday();
  const { data: statsData } = useStats();

  const trail = trailData?.data;
  const summary = statsData?.data?.summary ?? statsData?.data ?? null;

  const trailItems: TrailItem[] = trail?.items ?? [];
  const completedItems = trailItems.filter((item) => item.completed).length;
  const totalItems = trailItems.length;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  const progressValue = Math.min(100, Math.max(0, Math.round(progress)));
  const nextItem = trailItems.find((item) => !item.completed) || null;

  const accuracy = parseAccuracy(summary?.accuracy ?? summary?.average_accuracy);
  const streak = summary?.current_streak ?? summary?.maxStreak ?? 0;
  const dueReviews = summary?.topicsWithDueReview ?? summary?.srs_cards_due ?? 0;
  const totalAttempts = summary?.totalAttempts ?? summary?.total_attempts ?? 0;

  const firstName = (user?.name || '').trim().split(' ')[0] || 'Estudante';

  if (trailLoading) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-12 text-sm text-slate-500">
        Carregando seu painel...
      </div>
    );
  }

  return (
    <>
      <header className="flex items-center justify-between px-6 pt-8 pb-4 bg-background-light sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="bg-gradient-to-br from-primary/40 to-primary/10 rounded-full size-10 ring-2 ring-primary/20 shadow-sm flex items-center justify-center text-secondary font-semibold">
              {firstName.charAt(0).toUpperCase()}
            </div>
            <div className="absolute bottom-0 right-0 size-3 bg-green-400 rounded-full border-2 border-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-slate-500 text-xs font-medium">{getGreeting()},</span>
            <h2 className="text-secondary text-lg font-bold leading-tight">{firstName}</h2>
          </div>
        </div>
        <button className="relative p-2 rounded-full hover:bg-purple-50 transition-colors text-slate-600">
          <span className="material-symbols-outlined !text-[24px]">notifications</span>
          <span className="absolute top-2 right-2 size-2 bg-red-400 rounded-full" />
        </button>
      </header>

      <main className="flex-1 flex flex-col px-6">
        <section className="flex flex-col items-center justify-center py-8 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10" />
          <div className="relative size-60">
            <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 36 36">
              <path
                className="stroke-[2.5] text-purple-100"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="stroke-[2.5] text-primary"
                stroke="currentColor"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${progressValue}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-5xl font-bold text-secondary tracking-tight">{progressValue}%</span>
              <span className="text-sm font-medium text-slate-500 mt-1 uppercase tracking-wide">Meta diaria</span>
              <div className="mt-3 px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined !text-[14px]">trending_up</span>
                {totalItems ? `${totalItems} itens` : 'Comece hoje'}
              </div>
            </div>
          </div>
        </section>

        <section className="w-full mb-8">
          <Link
            href="/estudar"
            className="group w-full h-14 bg-primary hover:bg-primary-dark active:scale-[0.98] transition-all duration-200 rounded-xl shadow-glow flex items-center justify-center gap-3 text-white"
          >
            <div className="bg-white/20 rounded-full p-1 group-hover:bg-white/30 transition-colors">
              <span className="material-symbols-outlined !text-[20px]">play_arrow</span>
            </div>
            <span className="text-lg font-bold tracking-wide">Estudar agora</span>
          </Link>
          <p className="mt-2 text-xs text-slate-500">
            {trail?.total_duration_minutes ?? 0} min • {completedItems}/{totalItems} concluidos
          </p>
          <p className="text-xs text-slate-400">{formatToday()}</p>
        </section>

        <section className="w-full">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-secondary text-base font-bold">Proximo bloco</h3>
            <Link href="/plano-diario" className="text-primary text-sm font-medium hover:underline">
              Ver tudo
            </Link>
          </div>
          {nextItem ? (
            <div className="bg-surface-light rounded-2xl p-4 shadow-soft border border-purple-50 flex gap-4 hover:border-primary/30 transition-colors">
              <div className="flex flex-col justify-between flex-1 py-1">
                <div>
                  <div className="flex items-center gap-1 text-slate-400 text-xs font-medium mb-1">
                    <span>Trilha</span>
                    <span className="material-symbols-outlined !text-[10px]">chevron_right</span>
                    <span>{nextItem.type}</span>
                  </div>
                  <h4 className="text-slate-900 text-lg font-bold leading-tight">{nextItem.reason}</h4>
                  <p className="text-slate-500 text-sm mt-1">Continue sua sequencia</p>
                </div>
                <div className="flex items-center gap-3 mt-4">
                  <div className="flex items-center gap-1.5 text-purple-600 bg-purple-50 px-2 py-1 rounded-md">
                    <span className="material-symbols-outlined !text-[16px]">style</span>
                    <span className="text-xs font-bold">{totalItems || 1} itens</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                    <span className="material-symbols-outlined !text-[16px]">schedule</span>
                    <span>{nextItem.duration_minutes} min</span>
                  </div>
                </div>
              </div>
              <div className="w-24 h-auto aspect-[3/4] rounded-lg bg-slate-200 shrink-0 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
            </div>
          ) : (
            <div className="bg-surface-light rounded-2xl p-4 shadow-soft border border-purple-50 text-sm text-slate-500">
              Nenhum bloco pendente. Prepare um novo estudo quando quiser.
            </div>
          )}
        </section>

        <section className="mt-8 grid grid-cols-2 gap-3">
          <div className="bg-surface-light rounded-2xl p-4 shadow-soft border border-purple-50">
            <p className="text-xs text-slate-500">Sequencia</p>
            <p className="text-xl font-bold text-secondary mt-1">{streak} dias</p>
          </div>
          <div className="bg-surface-light rounded-2xl p-4 shadow-soft border border-purple-50">
            <p className="text-xs text-slate-500">Taxa de acerto</p>
            <p className="text-xl font-bold text-secondary mt-1">
              {accuracy == null ? '-' : `${Math.round(accuracy)}%`}
            </p>
          </div>
          <div className="bg-surface-light rounded-2xl p-4 shadow-soft border border-purple-50 col-span-2">
            <p className="text-xs text-slate-500">Revisoes pendentes</p>
            <p className="text-xl font-bold text-secondary mt-1">{dueReviews}</p>
            <p className="text-[11px] text-slate-400">{totalAttempts} respostas registradas</p>
          </div>
        </section>
      </main>
    </>
  );
}

