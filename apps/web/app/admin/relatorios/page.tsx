import { Suspense } from 'react';
import RelatoriosMensaisClient from './RelatoriosMensaisClient';

export const metadata = { title: 'Relatórios Mensais | Edro' };

export default function Page() {
  return (
    <Suspense>
      <RelatoriosMensaisClient />
    </Suspense>
  );
}
