'use client';

import ClippingClient from '@/app/clipping/ClippingClient';

type ClientClippingClientProps = {
  clientId: string;
};

export default function ClientClippingClient({ clientId }: ClientClippingClientProps) {
  return <ClippingClient clientId={clientId} noShell embedded />;
}
