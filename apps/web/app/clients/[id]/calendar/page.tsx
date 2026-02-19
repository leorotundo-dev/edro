import { Suspense } from 'react';
import ClientCalendarClient from './ClientCalendarClient';

type ClientCalendarPageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: ClientCalendarPageProps) {
  const { id } = await params;
  return (
    <Suspense>
      <ClientCalendarClient clientId={id} />
    </Suspense>
  );
}
