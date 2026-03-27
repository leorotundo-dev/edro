import { Suspense } from 'react';
import CentralDeControleClient from './CentralDeControleClient';

export const metadata = { title: 'Central de Controle | Edro' };

export default function Page() {
  return (
    <Suspense>
      <CentralDeControleClient />
    </Suspense>
  );
}
