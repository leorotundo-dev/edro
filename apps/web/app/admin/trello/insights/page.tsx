import { Suspense } from 'react';
import TrelloInsightsClient from './TrelloInsightsClient';

export const metadata = { title: 'Insights Trello | Edro' };

export default function Page({ searchParams }: { searchParams: { boardId?: string } }) {
  return (
    <Suspense>
      <TrelloInsightsClient boardId={searchParams.boardId} />
    </Suspense>
  );
}
