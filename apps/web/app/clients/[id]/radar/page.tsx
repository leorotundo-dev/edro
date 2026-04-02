'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { IconEyeOff, IconNews, IconTelescope, IconUsersGroup } from '@tabler/icons-react';
import ClientClippingClient from '../clipping/ClientClippingClient';
import SocialListeningClient from '@/app/social-listening/SocialListeningClient';
import CompetitorsClient from '../concorrentes/CompetitorsClient';
import DarkFunnelClient from '../dark-funnel/DarkFunnelClient';

type RadarSub = 'clipping' | 'social' | 'mercado';

const SUB_TABS = [
  { value: 'clipping' as const, label: 'Clipping',  icon: <IconNews size={16} /> },
  { value: 'social' as const,   label: 'Social',    icon: <IconUsersGroup size={16} /> },
  { value: 'mercado' as const,  label: 'Mercado',   icon: <IconTelescope size={16} /> },
];

function parseSub(v: string | null): RadarSub {
  if (v === 'social') return 'social';
  if (v === 'mercado') return 'mercado';
  return 'clipping';
}

// ── Mercado — Concorrentes + Dark Funnel ──────────────────────────────────────

function MercadoSection({ clientId }: { clientId: string }) {
  return (
    <Box>
      <CompetitorsClient clientId={clientId} />
      <Divider sx={{ my: 5 }} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <IconEyeOff size={18} />
        <Typography variant="subtitle2" fontWeight={700}>Dark Funnel</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
          Sinais de intenção — interações privadas rastreadas
        </Typography>
      </Box>
      <DarkFunnelClient clientId={clientId} />
    </Box>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RadarPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = params.id as string;
  const [tab, setTab] = useState<RadarSub>(() => parseSub(searchParams.get('sub')));

  useEffect(() => {
    setTab(parseSub(searchParams.get('sub')));
  }, [searchParams]);

  const changeTab = (value: RadarSub) => {
    setTab(value);
    const next = new URLSearchParams(searchParams.toString());
    if (value === 'clipping') {
      next.delete('sub');
    } else {
      next.set('sub', value);
    }
    const qs = next.toString();
    router.replace(qs ? `/clients/${clientId}/radar?${qs}` : `/clients/${clientId}/radar`);
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

      {tab === 'clipping' && <ClientClippingClient clientId={clientId} forceTab="clipping" />}
      {tab === 'social'   && <SocialListeningClient clientId={clientId} noShell embedded />}
      {tab === 'mercado'  && <MercadoSection clientId={clientId} />}
    </Box>
  );
}
