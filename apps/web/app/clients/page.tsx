import { Suspense } from 'react';
import AppShell from '@/components/AppShell';
import ClientsListClient from './ClientsListClient';

export default function Page() {
  return (
    <AppShell title="Clientes">
      <Suspense>
        <ClientsListClient />
      </Suspense>
    </AppShell>
  );
}
