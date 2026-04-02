'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { apiGet } from '@/lib/api';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import {
  IconBook2,
  IconBulb,
  IconDna,
  IconSettings,
  IconUsers,
} from '@tabler/icons-react';
import PerfilPage, { type IdentityWorkspaceTab } from '../perfil/page';
import ClientConfigWorkspace from './ClientConfigWorkspace';

type IdentidadeSub = IdentityWorkspaceTab | 'config';

type ClientIdentitySummary = {
  id: string;
  name: string;
  segment_primary?: string | null;
  city?: string | null;
  uf?: string | null;
  content_pillars?: string[] | null;
  keywords?: string[] | null;
};

const SUB_TABS = [
  {
    value: 'dna' as const,
    label: 'DNA',
    icon: <IconDna size={16} />,
    description: 'Essência da marca, voz, personas, visual e posicionamento.',
  },
  {
    value: 'editorial' as const,
    label: 'Editorial',
    icon: <IconBulb size={16} />,
    description: 'Pilares, palavras-chave, gaps e o que a marca deve publicar.',
  },
  {
    value: 'contatos' as const,
    label: 'Contatos',
    icon: <IconUsers size={16} />,
    description: 'Quem fala pelo cliente, aprova e move a operação.',
  },
  {
    value: 'biblioteca' as const,
    label: 'Biblioteca',
    icon: <IconBook2 size={16} />,
    description: 'Logos, brandbook, templates e ativos de marca.',
  },
  {
    value: 'config' as const,
    label: 'Configurações',
    icon: <IconSettings size={16} />,
    description: 'Conectores e permissões para operar este cliente.',
  },
] as const;

function parseSub(v: string | null): IdentidadeSub {
  if (v === 'dna') return 'dna';
  if (v === 'editorial' || v === 'conteudo') return 'editorial';
  if (v === 'contatos') return 'contatos';
  if (v === 'biblioteca') return 'biblioteca';
  if (v === 'config') return 'config';
  if (v === 'integracoes' || v === 'acesso') return 'config';
  if (v === 'perfil' || v === 'identidade') return 'dna';
  if (v === 'library') return 'biblioteca';
  return 'dna';
}

export default function IdentidadePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = params.id as string;
  const [tab, setTab] = useState<IdentidadeSub>(() => parseSub(searchParams.get('sub')));
  const [client, setClient] = useState<ClientIdentitySummary | null>(null);

  useEffect(() => {
    setTab(parseSub(searchParams.get('sub')));
  }, [searchParams]);

  useEffect(() => {
    let active = true;

    const loadClient = async () => {
      try {
        const response = await apiGet(`/clients/${clientId}`);
        const payload =
          (response as { client?: ClientIdentitySummary })?.client ??
          (response as { data?: { client?: ClientIdentitySummary } })?.data?.client ??
          (response as { data?: ClientIdentitySummary })?.data ??
          (response as ClientIdentitySummary);
        if (active) setClient(payload ?? null);
      } catch {
        if (active) setClient(null);
      }
    };

    loadClient();
    return () => {
      active = false;
    };
  }, [clientId]);

  const changeTab = (value: IdentidadeSub) => {
    setTab(value);
    const next = new URLSearchParams(searchParams.toString());
    if (value === 'dna') {
      next.delete('sub');
    } else {
      next.set('sub', value);
    }
    const qs = next.toString();
    router.replace(qs ? `/clients/${clientId}/identidade?${qs}` : `/clients/${clientId}/identidade`);
  };

  const activeTab = SUB_TABS.find((item) => item.value === tab) ?? SUB_TABS[0];

  return (
    <Stack spacing={2.5}>
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <Tabs
            value={tab}
            onChange={(_, v) => changeTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { minHeight: 44 } }}
          >
            {SUB_TABS.map((item) => (
              <Tab
                key={item.value}
                value={item.value}
                label={item.label}
                icon={item.icon}
                iconPosition="start"
                sx={{ fontSize: '0.85rem' }}
              />
            ))}
          </Tabs>

          <Box
            sx={(theme) => ({
              mb: 3,
              px: { xs: 1.5, md: 2 },
              py: 1.75,
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
              backgroundColor: alpha(theme.palette.primary.main, 0.03),
            })}
          >
            <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>
              {activeTab.label}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {activeTab.description}
            </Typography>
          </Box>

          {tab === 'config'
            ? <ClientConfigWorkspace />
            : <PerfilPage clientId={clientId} activeTab={tab} showTabs={false} />}
        </Box>
      </Card>
    </Stack>
  );
}
