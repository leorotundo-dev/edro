import { Suspense } from 'react';
import PerformanceClient from './PerformanceClient';

export default function Page() {
  return (
    <Suspense>
      <PerformanceClient />
    </Suspense>
  );
}
