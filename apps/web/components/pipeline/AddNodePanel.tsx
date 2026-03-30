'use client';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Fab from '@mui/material/Fab';
import Tooltip from '@mui/material/Tooltip';
import { IconPlus, IconX, IconLayersLinked, IconTestPipe, IconMovie, IconMail, IconCalendar, IconChartBar, IconBrain, IconShieldCheck, IconBulb, IconCalendarEvent, IconFlask } from '@tabler/icons-react';
import { useState } from 'react';

type NodeCategory = {
  label: string;
  items: NodeOption[];
};

type NodeOption = {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
};

const CATEGORIES: NodeCategory[] = [
  {
    label: 'Estratégia',
    items: [
      { id: 'conceito',  label: 'Conceito Criativo', description: 'Gerar 5 conceitos rankeados com tensão emocional e direção visual', icon: <IconBulb size={16} />, color: '#A855F7' },
      { id: 'campanha',  label: 'Campanha Sequencial', description: '3 a 7 peças encadeadas com arco narrativo e calendário sugerido', icon: <IconCalendarEvent size={16} />, color: '#F59E0B' },
    ],
  },
  {
    label: 'QA & Revisão',
    items: [
      { id: 'critica', label: 'Agente Crítico', description: 'Auto-revisão da copy: score vs. briefing, AMD e voz da marca', icon: <IconShieldCheck size={16} />, color: '#EF4444' },
    ],
  },
  {
    label: 'Variantes',
    items: [
      { id: 'multiFormat', label: 'Multi-Formato', description: 'Gerar para múltiplas plataformas e tamanhos', icon: <IconLayersLinked size={16} />, color: '#F97316' },
      { id: 'abTest',      label: 'Teste A/B',     description: 'Comparar variantes de copy com split de audiência', icon: <IconTestPipe size={16} />, color: '#F97316' },
    ],
  },
  {
    label: 'Conteúdo',
    items: [
      { id: 'videoScript', label: 'Roteiro de Vídeo', description: 'Gerar roteiro em cenas para vídeo social', icon: <IconMovie size={16} />, color: '#A855F7' },
    ],
  },
  {
    label: 'Distribuição',
    items: [
      { id: 'simulation', label: 'Simulação de Resultado', description: 'Prever CTR, salvar e engajamento antes de publicar', icon: <IconFlask size={16} />, color: '#5D87FF' },
      { id: 'approval', label: 'Aprovação do Cliente', description: 'Enviar peça para aprovação antes de publicar', icon: <IconMail size={16} />, color: '#7C3AED' },
      { id: 'schedule', label: 'Agendar Publicação', description: 'Definir data e hora de publicação com sugestão de IA', icon: <IconCalendar size={16} />, color: '#7C3AED' },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { id: 'performance',       label: 'Performance',       description: 'Métricas de desempenho após publicação', icon: <IconChartBar size={16} />, color: '#0EA5E9' },
      { id: 'learningFeedback', label: 'Fechar Loop',       description: 'Salvar aprendizados no LearningEngine', icon: <IconBrain size={16} />, color: '#0EA5E9' },
    ],
  },
];

interface AddNodePanelProps {
  activeNodeIds: Set<string>;
  onAddNode: (nodeId: string) => void;
}

export default function AddNodePanel({ activeNodeIds, onAddNode }: AddNodePanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Panel */}
      {open && (
        <Box sx={{
          position: 'absolute', bottom: 56, left: 0,
          width: 280, maxHeight: '60vh', overflowY: 'auto',
          bgcolor: '#111', border: '1px solid #2a2a2a', borderRadius: 2.5,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          zIndex: 100,
        }}>
          <Stack spacing={0} divider={<Box sx={{ height: 1, bgcolor: '#1e1e1e' }} />}>
            <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid #1e1e1e' }}>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.primary' }}>
                Adicionar Node
              </Typography>
              <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled' }}>
                Expanda seu pipeline com funcionalidades extras
              </Typography>
            </Box>

            {CATEGORIES.map((cat) => (
              <Box key={cat.label} sx={{ px: 1.5, py: 1 }}>
                <Typography sx={{
                  fontSize: '0.55rem', color: '#555', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.75,
                }}>
                  {cat.label}
                </Typography>
                <Stack spacing={0.5}>
                  {cat.items.map((item) => {
                    const alreadyAdded = activeNodeIds.has(item.id);
                    return (
                      <Box
                        key={item.id}
                        onClick={() => {
                          if (alreadyAdded) return;
                          onAddNode(item.id);
                          setOpen(false);
                        }}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 1,
                          p: 0.75, borderRadius: 1.5, cursor: alreadyAdded ? 'default' : 'pointer',
                          border: `1px solid ${alreadyAdded ? '#1e1e1e' : `${item.color}33`}`,
                          bgcolor: alreadyAdded ? 'transparent' : `${item.color}08`,
                          opacity: alreadyAdded ? 0.45 : 1,
                          transition: 'all 0.15s',
                          '&:hover': alreadyAdded ? {} : {
                            bgcolor: `${item.color}14`,
                            borderColor: item.color,
                          },
                        }}
                      >
                        <Box sx={{ color: item.color, display: 'flex', flexShrink: 0 }}>
                          {item.icon}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color: alreadyAdded ? '#555' : 'text.primary' }}>
                            {item.label}
                            {alreadyAdded && <Typography component="span" sx={{ fontSize: '0.55rem', color: '#555', ml: 0.5 }}>· adicionado</Typography>}
                          </Typography>
                          <Typography sx={{ fontSize: '0.58rem', color: 'text.disabled', lineHeight: 1.4 }}>
                            {item.description}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {/* FAB */}
      <Tooltip title={open ? 'Fechar' : 'Adicionar node'} placement="right">
        <Fab
          size="small"
          onClick={() => setOpen((p) => !p)}
          sx={{
            bgcolor: open ? '#2a2a2a' : '#1e1e1e',
            color: open ? '#888' : '#E85219',
            border: `1px solid ${open ? '#333' : '#E8521944'}`,
            boxShadow: 'none',
            width: 40, height: 40,
            '&:hover': { bgcolor: '#2a2a2a', color: '#E85219' },
            transition: 'all 0.2s',
          }}
        >
          {open ? <IconX size={16} /> : <IconPlus size={16} />}
        </Fab>
      </Tooltip>
    </Box>
  );
}
