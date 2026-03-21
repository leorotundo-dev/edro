'use client';

import { useState, useRef, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import Typography from '@mui/material/Typography';
import ButtonBase from '@mui/material/ButtonBase';
import Divider from '@mui/material/Divider';
import {
  IconBrain,
  IconSearch,
  IconAlertTriangle,
  IconClipboardList,
  IconChartBar,
  IconBulb,
  IconPencil,
  IconCalendarEvent,
  IconTargetArrow,
  IconMessageCircle,
  IconUsers,
  IconArrowRight,
} from '@tabler/icons-react';
import { useJarvis } from '@/contexts/JarvisContext';

const EDRO_ORANGE = '#E85219';

type QuickAction = {
  icon: React.ReactNode;
  label: string;
  prompt: string;
  color?: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: <IconAlertTriangle size={15} />,
    label: 'Jobs urgentes',
    prompt: 'Quais jobs estão urgentes ou atrasados agora?',
    color: '#ef4444',
  },
  {
    icon: <IconClipboardList size={15} />,
    label: 'Resumo de hoje',
    prompt: 'Me dê um resumo do que preciso fazer hoje nas operações.',
  },
  {
    icon: <IconBulb size={15} />,
    label: 'Oportunidades da semana',
    prompt: 'Quais são as oportunidades de conteúdo mais relevantes desta semana?',
    color: '#f59e0b',
  },
  {
    icon: <IconPencil size={15} />,
    label: 'Criar briefing',
    prompt: 'Quero criar um briefing inteligente para um job. Me ajude a começar.',
    color: EDRO_ORANGE,
  },
  {
    icon: <IconChartBar size={15} />,
    label: 'Performance recente',
    prompt: 'Mostre a performance das últimas campanhas e o que os dados dizem.',
    color: '#10b981',
  },
  {
    icon: <IconTargetArrow size={15} />,
    label: 'Simular campanha',
    prompt: 'Quero simular o sucesso de uma campanha antes de publicar.',
    color: '#8b5cf6',
  },
  {
    icon: <IconUsers size={15} />,
    label: 'Clusters de audiência',
    prompt: 'Mostre os clusters de comportamento do cliente ativo e o que cada um prefere.',
  },
  {
    icon: <IconCalendarEvent size={15} />,
    label: 'Agenda da semana',
    prompt: 'Quais eventos e datas importantes tenho nesta semana?',
  },
  {
    icon: <IconMessageCircle size={15} />,
    label: 'Insights de WhatsApp',
    prompt: 'Há alguma mensagem importante nos grupos de WhatsApp dos clientes?',
  },
];

export default function JarvisCommandPalette() {
  const { isPaletteOpen, closePalette, openWithMessage, clientName, pageContext } = useJarvis();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when palette opens, reset query on close
  useEffect(() => {
    if (isPaletteOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isPaletteOpen]);

  const handleSend = (prompt: string) => {
    if (!prompt.trim()) return;
    openWithMessage(prompt.trim());
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      handleSend(query);
    }
  };

  const contextLabel = pageContext.type === 'job' && pageContext.label
    ? `Job: ${pageContext.label}`
    : pageContext.type === 'client' && clientName
    ? `Cliente: ${clientName}`
    : null;

  return (
    <Dialog
      open={isPaletteOpen}
      onClose={closePalette}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: { xs: '95vw', sm: 580 },
          maxWidth: 580,
          borderRadius: '14px',
          overflow: 'hidden',
          bgcolor: 'background.paper',
          boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
          border: '1px solid',
          borderColor: 'divider',
          m: 2,
        },
      }}
      sx={{
        '& .MuiBackdrop-root': { backdropFilter: 'blur(4px)', bgcolor: 'rgba(0,0,0,0.5)' },
      }}
      TransitionProps={{ timeout: 150 }}
    >
      {/* Search input */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2,
          py: 1.5,
          gap: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ color: EDRO_ORANGE, display: 'flex', flexShrink: 0 }}>
          <IconBrain size={20} />
        </Box>
        <InputBase
          inputRef={inputRef}
          fullWidth
          placeholder={contextLabel ? `Jarvis · ${contextLabel} — o que você quer fazer?` : 'O que você quer fazer?'}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          sx={{
            fontSize: '0.95rem',
            '& input': { p: 0, '&::placeholder': { opacity: 0.45 } },
          }}
        />
        {query.trim() && (
          <ButtonBase
            onClick={() => handleSend(query)}
            sx={{
              flexShrink: 0,
              bgcolor: EDRO_ORANGE,
              color: '#fff',
              borderRadius: '6px',
              px: 1.25,
              py: 0.6,
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              '&:hover': { bgcolor: '#c94215' },
            }}
          >
            Enviar
            <IconArrowRight size={13} />
          </ButtonBase>
        )}
        <Box
          component="kbd"
          sx={{
            flexShrink: 0,
            fontSize: '0.68rem',
            color: 'text.disabled',
            bgcolor: 'action.hover',
            px: 0.75,
            py: 0.25,
            borderRadius: '4px',
            fontFamily: 'monospace',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          Esc
        </Box>
      </Box>

      {/* Quick actions */}
      <Box sx={{ p: 1.5 }}>
        <Typography
          variant="overline"
          sx={{ px: 1, fontSize: '0.6rem', fontWeight: 700, color: 'text.disabled', letterSpacing: '0.1em' }}
        >
          Ações rápidas
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 0.75,
            mt: 0.75,
          }}
        >
          {QUICK_ACTIONS.map((action) => (
            <ButtonBase
              key={action.label}
              onClick={() => handleSend(action.prompt)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.25,
                py: 1,
                borderRadius: '8px',
                border: '1px solid',
                borderColor: 'divider',
                textAlign: 'left',
                justifyContent: 'flex-start',
                transition: 'all 0.12s ease',
                '&:hover': {
                  bgcolor: 'action.hover',
                  borderColor: action.color ?? EDRO_ORANGE,
                  '& .action-icon': { color: action.color ?? EDRO_ORANGE },
                },
              }}
            >
              <Box
                className="action-icon"
                sx={{ color: 'text.secondary', display: 'flex', flexShrink: 0, transition: 'color 0.12s' }}
              >
                {action.icon}
              </Box>
              <Typography
                sx={{ fontSize: '0.78rem', fontWeight: 500, color: 'text.primary', lineHeight: 1.3 }}
              >
                {action.label}
              </Typography>
            </ButtonBase>
          ))}
        </Box>
      </Box>

      {/* Footer hint */}
      <Divider />
      <Box
        sx={{
          px: 2,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box component="kbd" sx={{ fontSize: '0.6rem', color: 'text.disabled', bgcolor: 'action.hover', px: 0.5, borderRadius: '3px', fontFamily: 'monospace', border: '1px solid', borderColor: 'divider' }}>Enter</Box>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>enviar</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box component="kbd" sx={{ fontSize: '0.6rem', color: 'text.disabled', bgcolor: 'action.hover', px: 0.5, borderRadius: '3px', fontFamily: 'monospace', border: '1px solid', borderColor: 'divider' }}>Ctrl+J</Box>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>toggle</Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
          Jarvis — Edro Intelligence OS
        </Typography>
      </Box>
    </Dialog>
  );
}
