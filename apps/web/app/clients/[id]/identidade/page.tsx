'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { IconBook2, IconBulb, IconDna, IconSettings, IconUsers } from '@tabler/icons-react';
import PerfilPage, { type IdentityWorkspaceTab } from '../perfil/page';
import ClientConnectorsPage from '../connectors/page';
import ClientPermissionsPage from '../permissions/page';

type IdentidadeSub = IdentityWorkspaceTab | 'config';

const SUB_TABS = [
  { value: 'dna' as const,        label: 'DNA',           icon: <IconDna size={16} /> },
  { value: 'editorial' as const,  label: 'Editorial',     icon: <IconBulb size={16} /> },
  { value: 'contatos' as const,   label: 'Contatos',      icon: <IconUsers size={16} /> },
  { value: 'biblioteca' as const, label: 'Biblioteca',    icon: <IconBook2 size={16} /> },
  { value: 'config' as const,     label: 'Configurações', icon: <IconSettings size={16} /> },
];

function parseSub(v: string | null): IdentidadeSub {
  if (v === 'dna') return 'dna';
  if (v === 'editorial' || v === 'conteudo') return 'editorial';
  if (v === 'contatos') return 'contatos';
  if (v === 'biblioteca') return 'biblioteca';
  if (v === 'config') return 'config';
  // backward compat: old 'integracoes' and 'acesso' → config
  if (v === 'integracoes' || v === 'acesso') return 'config';
  if (v === 'perfil' || v === 'identidade') return 'dna';
  if (v === 'library') return 'biblioteca';
  return 'dna';
}

// ── Config — Integrações + Acesso ─────────────────────────────────────────────

function ConfigSection() {
  return (
    <Box>
      <ClientConnectorsPage />
      <Divider sx={{ my: 5 }} />
      <ClientPermissionsPage />
    </Box>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

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
    if (value === 'dna') {
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

      {tab === 'config'
        ? <ConfigSection />
        : <PerfilPage clientId={clientId} activeTab={tab} showTabs={false} />}
    </Box>
  );
}
