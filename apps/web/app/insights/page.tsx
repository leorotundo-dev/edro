import { Suspense } from 'react';
import InsightsClient from './InsightsClient';

export default function Page() {
  return (
    <Suspense>
      <InsightsClient />
    </Suspense>
  );
}
