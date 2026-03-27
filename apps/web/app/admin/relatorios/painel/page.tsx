import { Suspense } from 'react';
import PainelExecutivoClient from './PainelExecutivoClient';

export const metadata = { title: 'Painel Executivo | Edro' };

export default function Page() {
  return (
    <Suspense>
      <PainelExecutivoClient />
    </Suspense>
  );
}
