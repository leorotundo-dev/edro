import { Suspense } from 'react';
import RelatoriosWorkspaceClient from './RelatoriosWorkspaceClient';

export const metadata = { title: 'Relatórios | Edro' };

export default function Page() {
  return (
    <Suspense>
      <RelatoriosWorkspaceClient />
    </Suspense>
  );
}
