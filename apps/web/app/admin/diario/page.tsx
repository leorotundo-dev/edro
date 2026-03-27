import { Suspense } from 'react';
import DiarioClient from './DiarioClient';

export const metadata = { title: 'Diário da Agência | Edro' };

export default function Page() {
  return (
    <Suspense>
      <DiarioClient />
    </Suspense>
  );
}
