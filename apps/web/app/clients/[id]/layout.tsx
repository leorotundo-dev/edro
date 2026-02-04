'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import AppShell from '@/components/AppShell';

type ClientBasic = {
  id: string;
  name: string;
  segment_primary?: string | null;
  profile?: {
    knowledge_base?: {
      description?: string;
    };
  } | null;
};

type ClientLayoutProps = {
  children: React.ReactNode;
  params: { id: string };
};

const CLIENT_TABS = [
  { label: 'Overview', path: '' },
  { label: 'Calendar', path: '/calendar' },
  { label: 'Planning', path: '/planning' },
  { label: 'Creative', path: '/creative' },
  { label: 'Clipping', path: '/clipping' },
  { label: 'Library', path: '/library' },
  { label: 'Insights', path: '/insights' },
  { label: 'Performance', path: '/performance' },
];

export default function ClientLayout({ children, params }: ClientLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const clientId = params.id;

  const [client, setClient] = useState<ClientBasic | null>(null);
  const [loading, setLoading] = useState(true);

  const loadClient = useCallback(async () => {
    try {
      const res = await apiGet<{ client: ClientBasic }>(`/clients/${clientId}`);
      setClient(res.client);
    } catch (err) {
      console.error('Failed to load client:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  const basePath = `/clients/${clientId}`;

  const getActiveTab = () => {
    const currentPath = pathname.replace(basePath, '');
    if (!currentPath || currentPath === '/') return '';
    return currentPath;
  };

  const activeTab = getActiveTab();

  if (loading) {
    return (
      <AppShell title="Carregando...">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
            <p className="mt-4 text-muted">Carregando cliente...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={client?.name || 'Cliente'}>
      <div className="client-page-wrapper">
        {/* Client Header - Azul Mockup Style */}
        <div className="px-8 pt-10 pb-2 bg-card">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => router.push('/clients')}
                className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                title="Voltar para Clientes"
              >
                <span className="material-symbols-outlined text-slate-500">arrow_back</span>
              </button>
              <div>
                <h1 className="font-display text-5xl md:text-6xl text-slate-900 dark:text-white leading-tight">
                  {client?.name || 'Cliente'}
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                  {client?.segment_primary || client?.profile?.knowledge_base?.description || 'Sem segmento definido'}
                </p>
              </div>
            </div>
            <Link
              href={`/clients/${clientId}`}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-semibold text-sm"
            >
              <span className="material-symbols-outlined text-sm text-slate-500">edit</span>
              Edit Client
            </Link>
          </div>

          {/* Tab Navigation - Azul Mockup Style */}
          <div className="border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
            <nav className="flex space-x-8 min-w-max">
              {CLIENT_TABS.map((tab) => {
                const isActive = activeTab === tab.path;
                const href = `${basePath}${tab.path}`;

                return (
                  <Link
                    key={tab.path}
                    href={href}
                    className={`
                      py-4 px-1 text-sm transition-all border-b-2
                      ${isActive
                        ? 'border-[#FF6600] text-[#FF6600] font-semibold'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 font-medium'
                      }
                    `}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Page Content */}
        <main className="p-8 max-w-none">
          {children}
        </main>
      </div>
    </AppShell>
  );
}
