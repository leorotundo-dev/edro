import AppShell from '@/components/AppShell';
import GlobalLibraryClient from './GlobalLibraryClient';

export default function Page() {
  return (
    <AppShell title="Global Reference Library">
      <GlobalLibraryClient />
    </AppShell>
  );
}
