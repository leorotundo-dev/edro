'use client';

import PerformanceClient from '@/app/performance/PerformanceClient';

type ClientPerformanceClientProps = {
  clientId: string;
};

export default function ClientPerformanceClient({ clientId }: ClientPerformanceClientProps) {
  return <PerformanceClient clientId={clientId} noShell embedded />;
}
