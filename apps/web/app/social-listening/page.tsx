import { Suspense } from 'react';
import SocialListeningClient from './SocialListeningClient';

export default function Page() {
  return (
    <Suspense>
      <SocialListeningClient />
    </Suspense>
  );
}
