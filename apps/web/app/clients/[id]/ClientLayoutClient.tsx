'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import AppShell from '@/components/AppShell';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { IconChevronLeft, IconUser } from '@tabler/icons-react';

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

type ClientLayoutClientProps = {
  children: React.ReactNode;
  clientId: string;
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

export default function ClientLayoutClient({ children, clientId }: ClientLayoutClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [client, setClient] = useState<ClientBasic | null>(null);
  const [loading, setLoading] = useState(true);

  const loadClient = useCallback(async () => {
    try {
      const res = await apiGet(`/clients/${clientId}`);
      const payload =
        (res as { client?: ClientBasic })?.client ??
        (res as { data?: { client?: ClientBasic } })?.data?.client ??
        (res as { data?: ClientBasic })?.data ??
        (res as ClientBasic);
      setClient(payload || null);
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
  const tabValue = activeTab || 'overview';

  if (loading) {
    return (
      <AppShell title="Carregando...">
        <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Stack alignItems="center" spacing={2}>
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary">Carregando cliente...</Typography>
          </Stack>
        </Box>
      </AppShell>
    );
  }

  return (
    <AppShell title={client?.name || 'Cliente'}>
      <Box sx={{ px: { xs: 3, sm: 'clamp(24px, 4vw, 64px)' }, py: 3.5, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
        <Card variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <IconButton
                onClick={() => router.push('/clients')}
                aria-label="Voltar para Clientes"
                sx={{ border: '1px solid', borderColor: 'divider' }}
              >
                <IconChevronLeft size={18} />
              </IconButton>
              <Box>
                <Typography variant="h4">{client?.name || 'Cliente'}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {client?.segment_primary || client?.profile?.knowledge_base?.description || 'Sem segmento definido'}
                </Typography>
              </Box>
            </Stack>
            <Button
              variant="outlined"
              startIcon={<IconUser size={16} />}
              component={Link}
              href={`/clients/${clientId}`}
            >
              Editar cliente
            </Button>
          </Stack>

          <Tabs
            value={tabValue}
            onChange={(_, value) => {
              const target = value === 'overview' ? '' : value;
              router.push(`${basePath}${target}`);
            }}
            sx={{ mt: 2 }}
            variant="scrollable"
            allowScrollButtonsMobile
          >
            {CLIENT_TABS.map((tab) => (
              <Tab
                key={tab.label}
                label={tab.label}
                value={tab.path || 'overview'}
              />
            ))}
          </Tabs>
        </Card>

        {children}
      </Box>
    </AppShell>
  );
}
