import { Suspense } from 'react';
import AppShell from '@/components/AppShell';
import GlobalLibraryClient from './GlobalLibraryClient';

export default function Page() {
  return (
    <AppShell title="Global Reference Library">
      <Suspense>
        <GlobalLibraryClient />
      </Suspense>
    </AppShell>
  );
}
