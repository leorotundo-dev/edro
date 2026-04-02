'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { apiGet, apiPatch } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  IconBrandTrello,
  IconCalendarEvent,
  IconMessage2,
  IconNotes,
} from '@tabler/icons-react';
import ProjectBoardClient from '@/app/projetos/[boardId]/ProjectBoardClient';
import OperacaoRadarSection from './OperacaoRadarSection';
import MeetingsClient from '../meetings/MeetingsClient';
import WhatsAppClientTab from '../whatsapp/WhatsAppClientTab';
import ClientCalendarClient from '../calendar/ClientCalendarClient';
import ClientBriefingsClient from '../briefings/ClientBriefingsClient';
import CampaignsClient from '../campaigns/CampaignsClient';

// ── Types ─────────────────────────────────────────────────────────────────────

type OperacaoSub = 'board' | 'producao' | 'comunicacao' | 'agenda';
type ProducaoInner = 'briefings' | 'campanhas';
type ComunicacaoInner = 'reunioes' | 'whatsapp';

const SUB_TABS = [
  { value: 'board' as const,       label: 'Board',       icon: <IconBrandTrello size={16} /> },
  { value: 'producao' as const,    label: 'Produção',    icon: <IconNotes size={16} /> },
  { value: 'comunicacao' as const, label: 'Comunicação', icon: <IconMessage2 size={16} /> },
  { value: 'agenda' as const,      label: 'Agenda',      icon: <IconCalendarEvent size={16} /> },
];

function parseSub(v: string | null): OperacaoSub {
  if (v === 'producao') return 'producao';
  if (v === 'comunicacao') return 'comunicacao';
  if (v === 'agenda') return 'agenda';
  return 'board';
}

// ── Trello Board ──────────────────────────────────────────────────────────────

type ProjectBoard = { id: string; name: string; client_id?: string | null; card_count?: number };

function TrelloBoardSection({ clientId }: { clientId: string }) {
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
        const all = await apiGet<{ boards: ProjectBoard[] }>('/trello/project-boards');
        setAvailableBoards((all.boards ?? []).filter((b) => !b.client_id));
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

  const handleLink = useCallback(async () => {
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
        <Alert severity="info" action={<Button size="small" href="/clients" color="inherit">Ver Clientes</Button>}>
          Nenhum board Trello vinculado a este cliente.
        </Alert>
        {availableBoards.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, alignItems: { sm: 'center' }, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
            <TextField select size="small" label="Vincular board existente" value={selectedBoardId} onChange={(e) => setSelectedBoardId(e.target.value)} sx={{ minWidth: 260 }}>
              <MenuItem value="">Selecione um board</MenuItem>
              {availableBoards.map((b) => (
                <MenuItem key={b.id} value={b.id}>{b.name}{b.card_count != null ? ` · ${b.card_count} cards` : ''}</MenuItem>
              ))}
            </TextField>
            <Button variant="contained" onClick={handleLink} disabled={!selectedBoardId || linking} startIcon={linking ? <CircularProgress size={14} color="inherit" /> : undefined}>
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

// ── Produção — Briefings + Campanhas ─────────────────────────────────────────

function ProducaoSection({ clientId }: { clientId: string }) {
  const [inner, setInner] = useState<ProducaoInner>('briefings');
  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <ButtonGroup size="small" variant="outlined">
          <Button variant={inner === 'briefings' ? 'contained' : 'outlined'} onClick={() => setInner('briefings')}>
            Briefings
          </Button>
          <Button variant={inner === 'campanhas' ? 'contained' : 'outlined'} onClick={() => setInner('campanhas')}>
            Campanhas
          </Button>
        </ButtonGroup>
      </Box>
      {inner === 'briefings' && <ClientBriefingsClient clientId={clientId} />}
      {inner === 'campanhas' && <CampaignsClient clientId={clientId} />}
    </Box>
  );
}

// ── Comunicação — Reuniões + WhatsApp ─────────────────────────────────────────

function ComunicacaoSection({ clientId }: { clientId: string }) {
  const [inner, setInner] = useState<ComunicacaoInner>('reunioes');
  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <ButtonGroup size="small" variant="outlined">
          <Button variant={inner === 'reunioes' ? 'contained' : 'outlined'} onClick={() => setInner('reunioes')}>
            Reuniões
          </Button>
          <Button variant={inner === 'whatsapp' ? 'contained' : 'outlined'} onClick={() => setInner('whatsapp')}>
            WhatsApp
          </Button>
        </ButtonGroup>
      </Box>
      {inner === 'reunioes' && <MeetingsClient clientId={clientId} />}
      {inner === 'whatsapp' && <WhatsAppClientTab clientId={clientId} />}
    </Box>
  );
}

// ── Agenda — Calendário + Financeiro ──────────────────────────────────────────

function AgendaSection({ clientId }: { clientId: string }) {
  return (
    <Box>
      <ClientCalendarClient clientId={clientId} />
    </Box>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

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

      {tab === 'board'       && <TrelloBoardSection clientId={clientId} />}
      {tab === 'producao'    && <ProducaoSection    clientId={clientId} />}
      {tab === 'comunicacao' && <ComunicacaoSection clientId={clientId} />}
      {tab === 'agenda'      && <AgendaSection      clientId={clientId} />}
    </Box>
  );
}
