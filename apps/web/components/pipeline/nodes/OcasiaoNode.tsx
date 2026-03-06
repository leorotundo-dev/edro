'use client';
import { Handle, Position } from '@xyflow/react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import { IconCalendarEvent, IconCheck, IconSparkles, IconArrowRight } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import NodeShell from '../NodeShell';
import { usePipeline } from '../PipelineContext';

// Upcoming seasonal moments (static seed — ideally from API)
type Occasion = {
  id: string;
  label: string;
  emoji: string;
  date: string; // MM-DD
  category: 'data_comemorativa' | 'comercial' | 'cultural';
  suggestedTrigger?: string;
  suggestedTone?: string;
};

const OCCASIONS: Occasion[] = [
  { id: 'dia_maes',      label: 'Dia das Mães',       emoji: '💐', date: '05-11', category: 'data_comemorativa', suggestedTrigger: 'G06', suggestedTone: 'Inspirador' },
  { id: 'dia_pais',      label: 'Dia dos Pais',       emoji: '👨', date: '08-10', category: 'data_comemorativa', suggestedTrigger: 'G06', suggestedTone: 'Inspirador' },
  { id: 'black_friday',  label: 'Black Friday',       emoji: '🛍️', date: '11-29', category: 'comercial',         suggestedTrigger: 'G01', suggestedTone: 'Persuasivo' },
  { id: 'natal',         label: 'Natal',              emoji: '🎄', date: '12-25', category: 'data_comemorativa', suggestedTrigger: 'G04', suggestedTone: 'Inspirador' },
  { id: 'ano_novo',      label: 'Ano Novo',           emoji: '🎆', date: '01-01', category: 'data_comemorativa', suggestedTrigger: 'G05', suggestedTone: 'Inspirador' },
  { id: 'carnaval',      label: 'Carnaval',           emoji: '🎉', date: '03-04', category: 'cultural',          suggestedTrigger: 'G06', suggestedTone: 'Casual' },
  { id: 'pascoa',        label: 'Páscoa',             emoji: '🐣', date: '04-20', category: 'data_comemorativa', suggestedTrigger: 'G04', suggestedTone: 'Inspirador' },
  { id: 'dia_namorados', label: 'Dia dos Namorados',  emoji: '❤️', date: '06-12', category: 'data_comemorativa', suggestedTrigger: 'G06', suggestedTone: 'Inspirador' },
  { id: 'dia_crianca',   label: 'Dia das Crianças',   emoji: '🧸', date: '10-12', category: 'data_comemorativa', suggestedTrigger: 'G05', suggestedTone: 'Casual' },
  { id: 'cyber_monday',  label: 'Cyber Monday',       emoji: '💻', date: '12-02', category: 'comercial',         suggestedTrigger: 'G01', suggestedTone: 'Persuasivo' },
  { id: 'dia_mulher',    label: 'Dia da Mulher',      emoji: '🌸', date: '03-08', category: 'data_comemorativa', suggestedTrigger: 'G06', suggestedTone: 'Inspirador' },
  { id: 'dia_trabalhador', label: 'Dia do Trabalhador', emoji: '🏆', date: '05-01', category: 'data_comemorativa', suggestedTrigger: 'G02', suggestedTone: 'Inspirador' },
];

const TRIGGER_NAMES: Record<string, string> = {
  G01: 'Escassez', G02: 'Autoridade', G03: 'Prova Social',
  G04: 'Reciprocidade', G05: 'Curiosidade', G06: 'Identidade', G07: 'Dor/Solução',
};

function daysUntil(dateStr: string): number {
  const now = new Date();
  const [month, day] = dateStr.split('-').map(Number);
  const target = new Date(now.getFullYear(), month - 1, day);
  if (target < now) target.setFullYear(now.getFullYear() + 1);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function urgencyColor(days: number): string {
  if (days <= 7) return '#FF4D4D';
  if (days <= 21) return '#F8A800';
  return '#13DEB9';
}

function urgencyLabel(days: number): string {
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Amanhã';
  if (days <= 7) return `${days} dias`;
  if (days <= 30) return `${Math.ceil(days / 7)} sem.`;
  return `${Math.ceil(days / 30)} mes.`;
}

export default function OcasiaoNode() {
  const { nodeStatus, ocasiao, setOcasiao, ocasiaoConfirmed, confirmOcasiao, setSelectedTrigger, setTone } = usePipeline();

  const [customDate, setCustomDate] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const status = nodeStatus.ocasiao ?? 'active';

  // Sort by upcoming (closest first, skip past ones or wrap to next year)
  const sorted = [...OCCASIONS]
    .map((o) => ({ ...o, days: daysUntil(o.date) }))
    .sort((a, b) => a.days - b.days);

  // Top 6 visible
  const topOccasions = sorted.slice(0, 6);

  const selected = ocasiao
    ? OCCASIONS.find((o) => o.id === ocasiao.id) ?? null
    : null;

  const handleSelect = (occ: Occasion) => {
    setOcasiao({ id: occ.id, label: occ.label, emoji: occ.emoji, days: daysUntil(occ.date),
      suggestedTrigger: occ.suggestedTrigger, suggestedTone: occ.suggestedTone });
  };

  const handleConfirm = () => {
    if (!ocasiao) return;
    // Auto-apply suggested trigger and tone if available
    if (ocasiao.suggestedTrigger) setSelectedTrigger(ocasiao.suggestedTrigger);
    if (ocasiao.suggestedTone) setTone(ocasiao.suggestedTone);
    confirmOcasiao();
  };

  const handleCustom = () => {
    if (!customDate && !customLabel) return;
    const label = customLabel || 'Data personalizada';
    setOcasiao({ id: 'custom', label, emoji: '📅', days: 0, suggestedTrigger: undefined, suggestedTone: undefined });
    setShowCustom(false);
  };

  const collapsedSummary = ocasiao ? (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <Typography sx={{ fontSize: '1rem', lineHeight: 1 }}>{ocasiao.emoji}</Typography>
      <Box>
        <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: 'text.primary' }}>{ocasiao.label}</Typography>
        {ocasiao.days !== undefined && (
          <Typography sx={{ fontSize: '0.58rem', color: urgencyColor(ocasiao.days) }}>
            {urgencyLabel(ocasiao.days)}
          </Typography>
        )}
      </Box>
      {ocasiao.suggestedTrigger && (
        <Chip size="small" label={`${ocasiao.suggestedTrigger} sugerido`}
          sx={{ height: 18, fontSize: '0.55rem', ml: 'auto', bgcolor: '#F8A80022', color: '#F8A800' }} />
      )}
    </Stack>
  ) : null;

  return (
    <Box>
      <NodeShell
        title="Momento Zero"
        icon={<IconCalendarEvent size={14} />}
        status={status}
        accentColor="#F8A800"
        width={300}
        collapsedSummary={collapsedSummary}
      >
        <Stack spacing={1.25}>
          <Typography sx={{ fontSize: '0.6rem', color: '#666', lineHeight: 1.5 }}>
            Escolha a ocasião ou data que ancora este conteúdo. A IA vai sugerir gatilho, tom e formato ideais para o momento.
          </Typography>

          {/* Calendar grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.75 }}>
            {topOccasions.map((occ) => {
              const isSelected = ocasiao?.id === occ.id;
              const color = urgencyColor(occ.days);
              return (
                <Box
                  key={occ.id}
                  onClick={() => handleSelect(occ)}
                  sx={{
                    p: 0.75, borderRadius: 1.5, cursor: 'pointer', textAlign: 'center',
                    border: '1.5px solid',
                    borderColor: isSelected ? '#F8A800' : '#1e1e1e',
                    bgcolor: isSelected ? 'rgba(248,168,0,0.1)' : 'transparent',
                    transition: 'all 0.15s',
                    '&:hover': { borderColor: '#F8A80066', bgcolor: 'rgba(248,168,0,0.05)' },
                  }}
                >
                  <Typography sx={{ fontSize: '1.1rem', mb: 0.15, lineHeight: 1 }}>{occ.emoji}</Typography>
                  <Typography sx={{ fontSize: '0.55rem', color: isSelected ? '#F8A800' : 'text.secondary',
                    fontWeight: isSelected ? 700 : 400, lineHeight: 1.3 }}>
                    {occ.label}
                  </Typography>
                  <Typography sx={{ fontSize: '0.52rem', color, mt: 0.15, fontWeight: 600 }}>
                    {urgencyLabel(occ.days)}
                  </Typography>
                </Box>
              );
            })}
          </Box>

          {/* Custom date toggle */}
          {!showCustom ? (
            <Button size="small" variant="text"
              onClick={() => setShowCustom(true)}
              sx={{ textTransform: 'none', fontSize: '0.6rem', color: '#555', py: 0, justifyContent: 'flex-start', px: 0 }}>
              + Adicionar data personalizada
            </Button>
          ) : (
            <Stack spacing={0.75}>
              <TextField size="small" fullWidth label="Descrição (ex: Lançamento produto)"
                value={customLabel} onChange={(e) => setCustomLabel(e.target.value)}
                sx={{ '& .MuiInputBase-root': { fontSize: '0.72rem' } }} />
              <Stack direction="row" spacing={0.75}>
                <TextField size="small" type="date" value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  sx={{ flex: 1, '& .MuiInputBase-root': { fontSize: '0.72rem' } }} />
                <Button size="small" variant="outlined" onClick={handleCustom}
                  sx={{ textTransform: 'none', fontSize: '0.65rem', borderColor: '#F8A80055', color: '#F8A800' }}>
                  OK
                </Button>
              </Stack>
            </Stack>
          )}

          {/* AI insight when occasion selected */}
          {ocasiao && (
            <Box sx={{ p: 0.875, borderRadius: 1.5, border: '1px solid #F8A80033', bgcolor: 'rgba(248,168,0,0.04)' }}>
              <Stack direction="row" spacing={0.5} alignItems="flex-start">
                <IconSparkles size={12} color="#F8A800" style={{ flexShrink: 0, marginTop: 1 }} />
                <Box>
                  <Typography sx={{ fontSize: '0.62rem', color: '#F8A800', fontWeight: 700, mb: 0.3 }}>
                    {ocasiao.label} — {ocasiao.days !== undefined ? urgencyLabel(ocasiao.days) : ''} para o momento
                  </Typography>
                  {ocasiao.suggestedTrigger && (
                    <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', lineHeight: 1.5 }}>
                      Gatilho recomendado: <strong style={{ color: '#F8A800' }}>
                        {ocasiao.suggestedTrigger} — {TRIGGER_NAMES[ocasiao.suggestedTrigger]}
                      </strong>
                    </Typography>
                  )}
                  {ocasiao.suggestedTone && (
                    <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
                      Tom ideal: <strong style={{ color: '#F8A800' }}>{ocasiao.suggestedTone}</strong>
                    </Typography>
                  )}
                  <Typography sx={{ fontSize: '0.57rem', color: '#555', mt: 0.3 }}>
                    Ao confirmar, esses parâmetros serão pré-aplicados nos próximos passos.
                  </Typography>
                </Box>
              </Stack>
            </Box>
          )}

          <Button
            variant="contained" size="small" fullWidth
            onClick={handleConfirm}
            disabled={!ocasiao}
            endIcon={<IconArrowRight size={13} />}
            sx={{
              bgcolor: '#F8A800', color: '#000', fontWeight: 700,
              fontSize: '0.7rem', textTransform: 'none',
              '&:hover': { bgcolor: '#d98e00' },
              '&.Mui-disabled': { bgcolor: '#2a2a2a', color: '#555' },
            }}
          >
            {ocasiao ? `Usar ${ocasiao.label}` : 'Selecione uma data'}
          </Button>
        </Stack>
      </NodeShell>

      <Handle type="source" position={Position.Right} id="ocasiao_out"
        style={{ background: ocasiaoConfirmed ? '#F8A800' : '#333', width: 10, height: 10, border: 'none' }} />
    </Box>
  );
}
