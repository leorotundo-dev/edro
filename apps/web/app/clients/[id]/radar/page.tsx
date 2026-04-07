'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Divider from '@mui/material/Divider';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useJarvisPage } from '@/hooks/useJarvisPage';
import { IconEyeOff, IconMessage2, IconNews, IconTelescope, IconUsersGroup } from '@tabler/icons-react';
import ClientClippingClient from '../clipping/ClientClippingClient';
import SocialListeningClient from '@/app/social-listening/SocialListeningClient';
import CompetitorsClient from '../concorrentes/CompetitorsClient';
import DarkFunnelClient from '../dark-funnel/DarkFunnelClient';
import MeetingsClient from '../meetings/MeetingsClient';
import WhatsAppClientTab from '../whatsapp/WhatsAppClientTab';

type RadarSub = 'clipping' | 'social' | 'mercado' | 'comunicacao';
type CommunicationInner = 'reunioes' | 'whatsapp';

const SUB_TABS = [
  { value: 'clipping' as const,     label: 'Clipping',    icon: <IconNews size={16} /> },
  { value: 'social' as const,       label: 'Social',      icon: <IconUsersGroup size={16} /> },
  { value: 'mercado' as const,      label: 'Mercado',     icon: <IconTelescope size={16} /> },
  { value: 'comunicacao' as const,  label: 'Comunicação', icon: <IconMessage2 size={16} /> },
];

function parseSub(v: string | null): RadarSub {
  if (v === 'social') return 'social';
  if (v === 'mercado') return 'mercado';
  if (v === 'comunicacao' || v === 'reunioes' || v === 'whatsapp') return 'comunicacao';
  return 'clipping';
}

function parseCommunicationInner(sub: string | null, inner: string | null): CommunicationInner {
  if (inner === 'whatsapp' || sub === 'whatsapp') return 'whatsapp';
  return 'reunioes';
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

function ComunicacaoSection({
  clientId,
  inner,
  onChangeInner,
}: {
  clientId: string;
  inner: CommunicationInner;
  onChangeInner: (value: CommunicationInner) => void;
}) {
  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <ButtonGroup size="small" variant="outlined">
          <Button variant={inner === 'reunioes' ? 'contained' : 'outlined'} onClick={() => onChangeInner('reunioes')}>
            Reuniões
          </Button>
          <Button variant={inner === 'whatsapp' ? 'contained' : 'outlined'} onClick={() => onChangeInner('whatsapp')}>
            WhatsApp
          </Button>
        </ButtonGroup>
      </Box>
      {inner === 'reunioes' && <MeetingsClient clientId={clientId} />}
      {inner === 'whatsapp' && <WhatsAppClientTab clientId={clientId} />}
    </Box>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RadarPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = params.id as string;
  const rawSub = searchParams.get('sub');
  const rawInner = searchParams.get('inner');
  const isLegacyCommunicationRoute = rawSub === 'reunioes' || rawSub === 'whatsapp';
  const [tab, setTab] = useState<RadarSub>(() => parseSub(rawSub));
  const [communicationInner, setCommunicationInner] = useState<CommunicationInner>(() => parseCommunicationInner(rawSub, rawInner));

  useJarvisPage({
    screen: 'client_radar',
    clientId,
    territory: 'radar',
    activeTab: tab,
    radarTab: tab,
    communicationInner: tab === 'comunicacao' ? communicationInner : null,
  }, [clientId, communicationInner, tab]);

  useEffect(() => {
    if (!isLegacyCommunicationRoute) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set('sub', 'comunicacao');
    next.set('inner', parseCommunicationInner(rawSub, rawInner));
    router.replace(`/clients/${clientId}/radar?${next.toString()}`);
  }, [clientId, isLegacyCommunicationRoute, rawInner, rawSub, router, searchParams]);

  useEffect(() => {
    setTab(parseSub(rawSub));
    setCommunicationInner(parseCommunicationInner(rawSub, rawInner));
  }, [rawInner, rawSub]);

  const replaceRoute = (nextTab: RadarSub, nextInner?: CommunicationInner) => {
    const next = new URLSearchParams(searchParams.toString());
    if (nextTab === 'clipping') {
      next.delete('sub');
      next.delete('inner');
    } else {
      next.set('sub', nextTab);
      if (nextTab === 'comunicacao') {
        next.set('inner', nextInner ?? 'reunioes');
      } else {
        next.delete('inner');
      }
    }
    const qs = next.toString();
    router.replace(qs ? `/clients/${clientId}/radar?${qs}` : `/clients/${clientId}/radar`);
  };

  const changeTab = (value: RadarSub) => {
    setTab(value);
    replaceRoute(value, value === 'comunicacao' ? communicationInner : undefined);
  };

  const changeCommunicationInner = (value: CommunicationInner) => {
    setTab('comunicacao');
    setCommunicationInner(value);
    replaceRoute('comunicacao', value);
  };

  if (isLegacyCommunicationRoute) return null;

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
      {tab === 'comunicacao' && (
        <ComunicacaoSection
          clientId={clientId}
          inner={communicationInner}
          onChangeInner={changeCommunicationInner}
        />
      )}
    </Box>
  );
}
