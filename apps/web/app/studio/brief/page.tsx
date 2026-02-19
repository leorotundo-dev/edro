import { Suspense } from 'react';
import BriefClient from './BriefClient';

export default function Page() {
  return (
    <Suspense>
      <BriefClient />
    </Suspense>
  );
}
