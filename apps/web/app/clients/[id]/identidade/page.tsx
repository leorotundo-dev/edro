'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { IconBook2, IconFingerprint, IconPlugConnected, IconShieldCheck } from '@tabler/icons-react';
import PerfilPage from '../perfil/page';
import ClientConnectorsPage from '../connectors/page';
import ClientPermissionsPage from '../permissions/page';
import ClientLibraryClient from '../library/ClientLibraryClient';

type IdentidadeSub = 'perfil' | 'biblioteca' | 'integracoes' | 'acesso';

const SUB_TABS = [
  { value: 'perfil' as const,      label: 'Perfil & Marca',  icon: <IconFingerprint size={16} /> },
  { value: 'biblioteca' as const,  label: 'Biblioteca',      icon: <IconBook2 size={16} /> },
  { value: 'integracoes' as const, label: 'Integrações',     icon: <IconPlugConnected size={16} /> },
  { value: 'acesso' as const,      label: 'Acesso',          icon: <IconShieldCheck size={16} /> },
];

function parseSub(v: string | null): IdentidadeSub {
  if (v === 'biblioteca') return 'biblioteca';
  if (v === 'integracoes') return 'integracoes';
  if (v === 'acesso') return 'acesso';
  return 'perfil';
}

export default function IdentidadePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = params.id as string;
  const [tab, setTab] = useState<IdentidadeSub>(() => parseSub(searchParams.get('sub')));

  useEffect(() => {
    setTab(parseSub(searchParams.get('sub')));
  }, [searchParams]);

  const changeTab = (value: IdentidadeSub) => {
    setTab(value);
    const next = new URLSearchParams(searchParams.toString());
    if (value === 'perfil') {
      next.delete('sub');
    } else {
      next.set('sub', value);
    }
    const qs = next.toString();
    router.replace(qs ? `/clients/${clientId}/identidade?${qs}` : `/clients/${clientId}/identidade`);
  };

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_, v) => changeTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { minHeight: 44 } }}
      >
        {SUB_TABS.map((t) => (
          <Tab key={t.value} value={t.value} label={t.label} icon={t.icon} iconPosition="start" sx={{ fontSize: '0.85rem' }} />
        ))}
      </Tabs>

      {tab === 'perfil' && <PerfilPage />}
      {tab === 'biblioteca' && <ClientLibraryClient clientId={clientId} />}
      {tab === 'integracoes' && <ClientConnectorsPage />}
      {tab === 'acesso' && <ClientPermissionsPage />}
    </Box>
  );
}
