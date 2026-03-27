import { Suspense } from 'react';
import RelatorioInterativoClient from './RelatorioInterativoClient';

export const metadata = { title: 'Relatório | Edro.Digital' };

// Public page — no auth required
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <Suspense>
      <RelatorioInterativoClient token={token} />
    </Suspense>
  );
}
