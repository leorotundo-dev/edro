import { Suspense } from 'react';
import OperationsJobsClient from './OperationsJobsClient';

export const metadata = { title: 'Demandas | Central de Operações | Edro Studio' };

export default function Page() {
  return (
    <Suspense>
      <OperationsJobsClient />
    </Suspense>
  );
}
