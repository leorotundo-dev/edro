'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import Slide from '@mui/material/Slide';
import { IconX, IconPlus, IconClockHour3, IconBrain, IconArrowsMaximize } from '@tabler/icons-react';
import { useJarvis } from '@/contexts/JarvisContext';
import JarvisChatPanel from './JarvisChatPanel';
import ConversationList from './ConversationList';

const EDRO_ORANGE = '#E85219';
const DRAWER_WIDTH = 420;

type Conversation = {
  id: string;
  title: string;
  [key: string]: any;
};

export default function JarvisDrawer() {
  const router = useRouter();
  const { isOpen, close, clientId, clientName, setConversationId, conversationId, pageContext } = useJarvis();
  const [showHistory, setShowHistory] = useState(false);

  const handleExpand = () => {
    close();
    router.push('/jarvis');
  };

  const handleNewConversation = () => {
    setConversationId(null);
    setShowHistory(false);
  };

  const handleSelectConversation = (conv: Conversation) => {
    setConversationId(conv.id);
    setShowHistory(false);
  };

  return (
    <Drawer
      anchor="right"
      open={isOpen}
      onClose={close}
      variant="temporary"
      ModalProps={{ keepMounted: true }}
      PaperProps={{
        sx: {
          width: { xs: '100vw', sm: DRAWER_WIDTH },
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
          borderLeft: 1,
          borderColor: 'divider',
          overflow: 'hidden',
        },
      }}
      sx={{ zIndex: 1200 }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
          flexShrink: 0,
          bgcolor: 'background.paper',
        }}
      >
        <Avatar sx={{ width: 32, height: 32, bgcolor: EDRO_ORANGE, fontSize: '0.75rem', fontWeight: 700 }}>
          <IconBrain size={16} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            Jarvis{clientName ? ` · ${clientName}` : ''}
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
            {pageContext.type === 'job' && pageContext.label
              ? `Job: ${pageContext.label}`
              : pageContext.type === 'client' && clientName
              ? `Cliente: ${clientName}`
              : conversationId
              ? 'Conversa ativa'
              : 'Contexto global'}
            {' ·'}{' '}
            <Box component="kbd" sx={{ fontSize: '0.58rem', opacity: 0.6, fontFamily: 'monospace', bgcolor: 'action.hover', px: 0.5, borderRadius: 0.5 }}>
              Ctrl+J
            </Box>
          </Typography>
        </Box>

        <Tooltip title="Nova conversa">
          <IconButton size="small" onClick={handleNewConversation} sx={{ color: 'text.secondary' }}>
            <IconPlus size={18} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Histórico">
          <IconButton
            size="small"
            onClick={() => setShowHistory(prev => !prev)}
            sx={{ color: showHistory ? EDRO_ORANGE : 'text.secondary' }}
          >
            <IconClockHour3 size={18} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Tela cheia">
          <IconButton size="small" onClick={handleExpand} sx={{ color: 'text.secondary' }}>
            <IconArrowsMaximize size={18} />
          </IconButton>
        </Tooltip>
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        <IconButton size="small" onClick={close} sx={{ color: 'text.secondary' }}>
          <IconX size={18} />
        </IconButton>
      </Box>

      {/* Body — history slide over chat */}
      <Box sx={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {/* Chat panel (always mounted) */}
        <Box sx={{ position: 'absolute', inset: 0, display: showHistory ? 'none' : 'flex', flexDirection: 'column' }}>
          <JarvisChatPanel />
        </Box>

        {/* Conversation list (slide in from left) */}
        <Slide direction="right" in={showHistory} mountOnEnter unmountOnExit>
          <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'background.default', zIndex: 1 }}>
            <ConversationList
              clientId={clientId}
              onSelect={handleSelectConversation}
              onBack={() => setShowHistory(false)}
            />
          </Box>
        </Slide>
      </Box>
    </Drawer>
  );
}
