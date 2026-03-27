import { Suspense } from 'react';
import FinanceiroCruzadoClient from './FinanceiroCruzadoClient';

export const metadata = { title: 'Financeiro | Edro' };

export default function Page() {
  return (
    <Suspense>
      <FinanceiroCruzadoClient />
    </Suspense>
  );
}
