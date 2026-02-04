import AppShell from '@/components/AppShell';
import ClientsListClient from './ClientsListClient';

export default function Page() {
  return (
    <AppShell title="Clients Management">
      <ClientsListClient />
    </AppShell>
  );
}
