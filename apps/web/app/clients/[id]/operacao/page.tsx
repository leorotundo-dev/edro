'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { apiGet } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { IconBrandTrello, IconCalendarEvent, IconCash, IconMessage, IconUsers } from '@tabler/icons-react';
import ProjectBoardClient from '@/app/projetos/[boardId]/ProjectBoardClient';
import OperacaoRadarSection from './OperacaoRadarSection';
import MeetingsClient from '../meetings/MeetingsClient';
import WhatsAppClientTab from '../whatsapp/WhatsAppClientTab';
import ClientFinanceiroPage from '../financeiro/page';
import ClientCalendarClient from '../calendar/ClientCalendarClient';

type OperacaoSub = 'board' | 'reunioes' | 'whatsapp' | 'financeiro' | 'calendario';

const SUB_TABS = [
  { value: 'board' as const,      label: 'Board',      icon: <IconBrandTrello size={16} /> },
  { value: 'reunioes' as const,   label: 'Reuniões',   icon: <IconUsers size={16} /> },
  { value: 'whatsapp' as const,   label: 'WhatsApp',   icon: <IconMessage size={16} /> },
  { value: 'financeiro' as const, label: 'Financeiro', icon: <IconCash size={16} /> },
  { value: 'calendario' as const, label: 'Calendário', icon: <IconCalendarEvent size={16} /> },
];

function parseSub(v: string | null): OperacaoSub {
  if (v === 'reunioes') return 'reunioes';
  if (v === 'whatsapp') return 'whatsapp';
  if (v === 'financeiro') return 'financeiro';
  if (v === 'calendario') return 'calendario';
  return 'board';
}

type ProjectBoard = { id: string; name: string };

function TrelloBoardSection({ clientId }: { clientId: string; }) {
  const [board, setBoard] = useState<ProjectBoard | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await apiGet<{ boards: ProjectBoard[] }>(`/trello/project-boards?client_id=${clientId}`);
      setBoard(res.boards?.[0] ?? null);
    } catch {
      setBoard(null);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return null;

  if (!board) {
    return (
      <Alert
        severity="info"
        action={
          <Button size="small" href="/projetos" color="inherit">
            Ver Projetos
          </Button>
        }
      >
        Nenhum board Trello vinculado a este cliente.
      </Alert>
    );
  }

  return (
    <Box>
      <OperacaoRadarSection boardId={board.id} clientId={clientId} />
      <Box sx={{ mx: -3 }}>
        <ProjectBoardClient boardId={board.id} noShell />
      </Box>
    </Box>
  );
}

export default function OperacaoPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = params.id as string;
  const [tab, setTab] = useState<OperacaoSub>(() => parseSub(searchParams.get('sub')));

  useEffect(() => {
    setTab(parseSub(searchParams.get('sub')));
  }, [searchParams]);

  const changeTab = (value: OperacaoSub) => {
    setTab(value);
    const next = new URLSearchParams(searchParams.toString());
    if (value === 'board') {
      next.delete('sub');
    } else {
      next.set('sub', value);
    }
    const qs = next.toString();
    router.replace(qs ? `/clients/${clientId}/operacao?${qs}` : `/clients/${clientId}/operacao`);
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

      {tab === 'board' && <TrelloBoardSection clientId={clientId} />}
      {tab === 'reunioes' && <MeetingsClient clientId={clientId} />}
      {tab === 'whatsapp' && <WhatsAppClientTab clientId={clientId} />}
      {tab === 'financeiro' && <ClientFinanceiroPage />}
      {tab === 'calendario' && <ClientCalendarClient clientId={clientId} />}
    </Box>
  );
}
