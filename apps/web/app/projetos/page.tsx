import { Suspense } from 'react';
import ProjetosClient from './ProjetosClient';

export const metadata = { title: 'Projetos | Edro' };

export default function Page() {
  return (
    <Suspense>
      <ProjetosClient />
    </Suspense>
  );
}
