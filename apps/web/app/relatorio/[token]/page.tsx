import { Suspense } from 'react';
import RelatorioInterativoClient from './RelatorioInterativoClient';

export const metadata = { title: 'Relatório | Edro.Digital' };

// Public page — no auth required
export default function Page({ params }: { params: { token: string } }) {
  return (
    <Suspense>
      <RelatorioInterativoClient token={params.token} />
    </Suspense>
  );
}
