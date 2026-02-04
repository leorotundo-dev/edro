import { Suspense } from 'react';
import PlanningClient from './PlanningClient';

export default function Page({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div className="loading-screen">Carregando planning...</div>}>
      <PlanningClient clientId={params.id} />
    </Suspense>
  );
}
