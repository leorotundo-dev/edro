import { Suspense } from 'react';
import TrelloInsightsClient from './TrelloInsightsClient';

export const metadata = { title: 'Insights Trello | Edro' };

export default async function Page({ searchParams }: { searchParams: Promise<{ boardId?: string }> }) {
  const { boardId } = await searchParams;
  return (
    <Suspense>
      <TrelloInsightsClient boardId={boardId} />
    </Suspense>
  );
}
