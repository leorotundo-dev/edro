import { Suspense } from 'react';
import ClientClippingClient from './ClientClippingClient';

type ClientRadarPageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: ClientRadarPageProps) {
  const { id } = await params;
  return (
    <Suspense>
      <ClientClippingClient clientId={id} />
    </Suspense>
  );
}
