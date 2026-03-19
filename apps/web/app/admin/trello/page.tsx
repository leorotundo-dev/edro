import { Suspense } from 'react';
import TrelloAdminClient from './TrelloAdminClient';

export const metadata = { title: 'Integração Trello | Edro' };

export default function Page() {
  return (
    <Suspense>
      <TrelloAdminClient />
    </Suspense>
  );
}
