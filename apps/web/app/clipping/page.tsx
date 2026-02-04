import AppShell from '@/components/AppShell';
import GlobalClippingClient from './GlobalClippingClient';

export default function Page() {
  return (
    <AppShell title="Global Radar Inbox">
      <GlobalClippingClient />
    </AppShell>
  );
}
