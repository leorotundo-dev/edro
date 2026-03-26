'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { apiGet, apiPatch } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
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

type ProjectBoard = {
  id: string;
  name: string;
  client_id?: string | null;
  card_count?: number;
};

function TrelloBoardSection({ clientId }: { clientId: string; }) {
  const [board, setBoard] = useState<ProjectBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableBoards, setAvailableBoards] = useState<ProjectBoard[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [linking, setLinking] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiGet<{ boards: ProjectBoard[] }>(`/trello/project-boards?client_id=${clientId}`);
      setBoard(res.boards?.[0] ?? null);
      if (!res.boards?.length) {
        const allBoardsRes = await apiGet<{ boards: ProjectBoard[] }>('/trello/project-boards');
        setAvailableBoards((allBoardsRes.boards ?? []).filter((candidate) => !candidate.client_id));
      } else {
        setAvailableBoards([]);
      }
    } catch {
      setBoard(null);
      setAvailableBoards([]);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const handleLinkBoard = useCallback(async () => {
    if (!selectedBoardId) return;
    setLinking(true);
    try {
      await apiPatch(`/trello/project-boards/${selectedBoardId}`, { client_id: clientId });
      setSelectedBoardId('');
      await load();
    } finally {
      setLinking(false);
    }
  }, [clientId, load, selectedBoardId]);

  if (loading) return null;

  if (!board) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Alert
          severity="info"
          action={
            <Button size="small" href="/clients" color="inherit">
              Ver Clientes
            </Button>
          }
        >
          Nenhum board Trello vinculado a este cliente.
        </Alert>

        {availableBoards.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 1.5,
              alignItems: { sm: 'center' },
              p: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: 'background.paper',
            }}
          >
            <TextField
              select
              size="small"
              label="Vincular board existente"
              value={selectedBoardId}
              onChange={(event) => setSelectedBoardId(event.target.value)}
              sx={{ minWidth: 260 }}
            >
              <MenuItem value="">Selecione um board</MenuItem>
              {availableBoards.map((candidate) => (
                <MenuItem key={candidate.id} value={candidate.id}>
                  {candidate.name}{candidate.card_count != null ? ` · ${candidate.card_count} cards` : ''}
                </MenuItem>
              ))}
            </TextField>
            <Button
              variant="contained"
              onClick={handleLinkBoard}
              disabled={!selectedBoardId || linking}
              startIcon={linking ? <CircularProgress size={14} color="inherit" /> : undefined}
            >
              Vincular board
            </Button>
          </Box>
        )}
      </Box>
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
