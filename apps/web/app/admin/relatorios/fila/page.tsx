import { Suspense } from 'react';
import FilaDeAcaoClient from './FilaDeAcaoClient';

export const metadata = { title: 'Fila de Ação | Edro' };

export default function Page() {
  return (
    <Suspense>
      <FilaDeAcaoClient />
    </Suspense>
  );
}
