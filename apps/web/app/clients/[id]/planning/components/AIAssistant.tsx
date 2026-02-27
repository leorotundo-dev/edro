'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import {
  IconArrowRight,
  IconBrain,
  IconFile,
  IconFileText,
  IconMessagePlus,
  IconPaperclip,
  IconRobot,
  IconSend,
  IconSparkles,
  IconWorld,
  IconX,
} from '@tabler/icons-react';

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  provider?: string;
  action?: {
    action: string;
    reason?: string;
    briefing?: { id: string; title: string; status?: string };
    copy?: { id: string; model?: string; provider?: string; preview?: string; count?: number };
    error?: string;
  };
};

export type ProviderOption = {
  id: string;
  name: string;
  description?: string;
};

type AIAssistantProps = {
  messages: ChatMessage[];
  providers: ProviderOption[];
  selectedProvider: string;
  mode: 'chat' | 'command';
  loading: boolean;
  onSendMessage: (message: string, files?: File[]) => void;
  onChangeProvider: (providerId: string) => void;
  onChangeMode: (mode: 'chat' | 'command') => void;
  onNewConversation: () => void;
  contextLoaded?: boolean;
  clientId?: string;
};

const QUICK_ACTIONS = [
  { label: 'Quais oportunidades de conteúdo existem para essa semana?', icon: <IconBrain size={13} /> },
  { label: 'Criar briefing de Instagram com base no calendário', icon: <IconFileText size={13} /> },
  { label: 'Sugerir pilares de conteúdo para esse cliente', icon: <IconSparkles size={13} /> },
  { label: 'Pesquisar tendências do setor e propor pautas', icon: <IconWorld size={13} /> },
];

const THINKING_MESSAGES = [
  'Analisando contexto do cliente...',
  'Consultando calendário e oportunidades...',
  'Pesquisando referências na web...',
  'Construindo estratégia...',
  'Refinando resposta...',
];

function formatTime(dateStr?: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function AIAssistant({
  messages,
  providers,
  selectedProvider,
  loading,
  onSendMessage,
  onChangeProvider,
  onNewConversation,
  contextLoaded,
  clientId,
}: AIAssistantProps) {
  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [thinkingIdx, setThinkingIdx] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, loading]);

  // Cycle thinking messages while loading
  useEffect(() => {
    if (!loading) {
      setThinkingIdx(0);
      return;
    }
    const interval = setInterval(
      () => setThinkingIdx((i) => (i + 1) % THINKING_MESSAGES.length),
      2800
    );
    return () => clearInterval(interval);
  }, [loading]);

  const handleSend = () => {
    if ((!input.trim() && attachedFiles.length === 0) || loading) return;
    onSendMessage(input.trim(), attachedFiles.length > 0 ? attachedFiles : undefined);
    setInput('');
    setAttachedFiles([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setAttachedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    e.target.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) setAttachedFiles((prev) => [...prev, ...files]);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  return (
    <Card
      variant="outlined"
      sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative' }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
    >
      {/* Drag overlay */}
      {dragOver && (
        <Box
          sx={{
            position: 'absolute', inset: 0, zIndex: 10,
            bgcolor: 'rgba(25,118,210,0.07)',
            border: '2px dashed', borderColor: 'primary.main', borderRadius: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <Stack alignItems="center" spacing={1}>
            <IconPaperclip size={36} color="#1976d2" />
            <Typography variant="subtitle2" color="primary.main">Solte para anexar ao chat</Typography>
          </Stack>
        </Box>
      )}

      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ px: 2, py: 1.25, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}
      >
        <Avatar sx={{ width: 26, height: 26, bgcolor: 'primary.light', color: 'primary.main' }}>
          <IconRobot size={14} />
        </Avatar>
        <Stack sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontSize: '0.8rem', lineHeight: 1.2 }}>
            Assistente de Planning
          </Typography>
          {contextLoaded && (
            <Typography variant="caption" sx={{ color: 'success.main', fontSize: '0.62rem', lineHeight: 1.2 }}>
              ● contexto carregado
            </Typography>
          )}
        </Stack>

        {providers.length > 0 && (
          <TextField
            select
            value={selectedProvider}
            onChange={(e) => onChangeProvider(e.target.value)}
            size="small"
            sx={{
              minWidth: 90,
              '& .MuiInputBase-root': { fontSize: '0.7rem', height: 28 },
              '& .MuiSelect-select': { py: 0.25, px: 0.75 },
            }}
          >
            {providers.map((opt) => (
              <MenuItem key={opt.id} value={opt.id} sx={{ fontSize: '0.75rem' }}>
                {opt.name}
              </MenuItem>
            ))}
          </TextField>
        )}

        <Tooltip title="Nova conversa">
          <IconButton size="small" onClick={onNewConversation}>
            <IconMessagePlus size={15} />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Messages */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 2,
          py: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          bgcolor: 'grey.50',
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.200', borderRadius: 2 },
        }}
      >
        {messages.length === 0 && !loading ? (
          /* Empty state */
          <Stack alignItems="center" justifyContent="center" sx={{ flex: 1, py: 4 }}>
            <Avatar sx={{ width: 46, height: 46, bgcolor: 'primary.light', color: 'primary.main', mb: 1.5 }}>
              <IconSparkles size={22} />
            </Avatar>
            <Typography variant="subtitle2" sx={{ mb: 0.5, fontSize: '0.9rem' }}>
              O que vamos construir hoje?
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 3, textAlign: 'center', maxWidth: 300, fontSize: '0.77rem', lineHeight: 1.6 }}
            >
              Crio briefings, analiso oportunidades, proponho estratégias — e pesquiso referências na web quando precisar.
            </Typography>
            <Stack spacing={0.75} sx={{ width: '100%', maxWidth: 360 }}>
              {QUICK_ACTIONS.map(({ label, icon }) => (
                <Button
                  key={label}
                  variant="outlined"
                  size="small"
                  startIcon={icon}
                  onClick={() => setInput(label)}
                  sx={{
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    borderColor: 'divider',
                    color: 'text.secondary',
                    '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.50', color: 'primary.main' },
                  }}
                >
                  {label}
                </Button>
              ))}
            </Stack>
          </Stack>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <Stack
                key={`${msg.timestamp}-${idx}`}
                direction="row"
                spacing={1}
                justifyContent={msg.role === 'user' ? 'flex-end' : 'flex-start'}
                alignItems="flex-start"
              >
                {msg.role === 'assistant' && (
                  <Avatar
                    sx={{ width: 22, height: 22, bgcolor: 'primary.light', color: 'primary.main', flexShrink: 0, mt: 0.5 }}
                  >
                    <IconRobot size={12} />
                  </Avatar>
                )}

                <Box sx={{ maxWidth: '82%' }}>
                  {/* Bubble */}
                  <Box
                    sx={{
                      px: 1.75,
                      py: 1.25,
                      borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      bgcolor: msg.role === 'user' ? 'primary.main' : '#ffffff',
                      color: msg.role === 'user' ? '#fff' : 'text.primary',
                      boxShadow: msg.role === 'assistant' ? '0 1px 4px rgba(0,0,0,0.05)' : 'none',
                      border: msg.role === 'assistant' ? '1px solid' : 'none',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.65, fontSize: '0.82rem' }}>
                      {msg.content}
                    </Typography>
                  </Box>

                  {/* Action card — success */}
                  {msg.action && msg.role === 'assistant' && !msg.action.error && (
                    <Box
                      sx={{
                        mt: 0.75,
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: 'success.light',
                        border: '1px solid',
                        borderColor: 'success.light',
                      }}
                    >
                      {msg.action.briefing && (
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <IconFileText size={16} color="#16a34a" style={{ flexShrink: 0 }} />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              variant="caption"
                              sx={{ fontWeight: 700, color: 'success.dark', display: 'block', lineHeight: 1.2 }}
                            >
                              Briefing criado
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 500, fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            >
                              {msg.action.briefing.title}
                            </Typography>
                          </Box>
                          {clientId && (
                            <Chip
                              component={Link}
                              href={`/edro/${msg.action.briefing.id}`}
                              label="Abrir"
                              size="small"
                              icon={<IconArrowRight size={11} />}
                              clickable
                              sx={{
                                fontSize: '0.68rem',
                                bgcolor: 'success.main',
                                color: '#fff',
                                flexShrink: 0,
                                '&:hover': { bgcolor: 'success.dark' },
                              }}
                            />
                          )}
                        </Stack>
                      )}

                      {msg.action.copy && (
                        <Stack spacing={0.5}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#15803d' }}>
                            {msg.action.copy.count ? `${msg.action.copy.count} copies geradas` : 'Copy gerada'}
                          </Typography>
                          {msg.action.copy.preview && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem', maxHeight: 80, overflow: 'hidden' }}
                            >
                              {msg.action.copy.preview}
                            </Typography>
                          )}
                        </Stack>
                      )}

                      {!msg.action.briefing && !msg.action.copy && (
                        <Typography variant="caption" sx={{ fontWeight: 600, color: '#15803d' }}>
                          {msg.action.action}
                        </Typography>
                      )}
                    </Box>
                  )}

                  {/* Action card — error */}
                  {msg.action?.error && (
                    <Box sx={{ mt: 0.75, p: 1.25, borderRadius: 2, bgcolor: 'error.light', border: '1px solid', borderColor: 'error.light' }}>
                      <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 600 }}>
                        {msg.action.error}
                      </Typography>
                    </Box>
                  )}

                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      mt: 0.5,
                      px: 0.5,
                      fontSize: '0.6rem',
                      color: 'text.disabled',
                      textAlign: msg.role === 'user' ? 'right' : 'left',
                    }}
                  >
                    {formatTime(msg.timestamp)}
                    {msg.provider && msg.role === 'assistant' && ` · ${msg.provider}`}
                  </Typography>
                </Box>
              </Stack>
            ))}

            {/* Thinking indicator */}
            {loading && (
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <Avatar
                  sx={{ width: 22, height: 22, bgcolor: 'primary.light', color: 'primary.main', flexShrink: 0, mt: 0.5 }}
                >
                  <IconRobot size={12} />
                </Avatar>
                <Box
                  sx={{
                    px: 2,
                    py: 1.25,
                    borderRadius: '16px 16px 16px 4px',
                    bgcolor: '#fff',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ display: 'flex', gap: 0.4, alignItems: 'center' }}>
                      {[0, 1, 2].map((i) => (
                        <Box
                          key={i}
                          sx={{
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            bgcolor: 'primary.main',
                            animation: 'chatBounce 1.2s infinite ease-in-out both',
                            animationDelay: `${i * 0.18}s`,
                            '@keyframes chatBounce': {
                              '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: 0.3 },
                              '40%': { transform: 'scale(1)', opacity: 1 },
                            },
                          }}
                        />
                      ))}
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      {THINKING_MESSAGES[thinkingIdx]}
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input area */}
      <Box sx={{ borderTop: '1px solid', borderColor: 'divider', flexShrink: 0, bgcolor: '#fff' }}>
        {/* Attached files strip */}
        {attachedFiles.length > 0 && (
          <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ px: 2, pt: 1.25, pb: 0 }}>
            {attachedFiles.map((file, idx) => (
              <Chip
                key={`${file.name}-${idx}`}
                icon={<IconFile size={12} />}
                label={file.name.length > 24 ? file.name.slice(0, 21) + '…' : file.name}
                size="small"
                onDelete={() => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))}
                deleteIcon={<IconX size={11} />}
                sx={{ fontSize: '0.68rem', height: 24 }}
              />
            ))}
          </Stack>
        )}

        <Stack direction="row" spacing={1} alignItems="flex-end" sx={{ px: 2, py: 1.25 }}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx,.md,.json,.png,.jpg,.jpeg,.webp"
            onChange={handleFileSelect}
          />
          <Tooltip title="Anexar arquivo (ou arraste aqui)">
            <IconButton
              size="small"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              sx={{ flexShrink: 0, color: 'text.secondary' }}
            >
              <IconPaperclip size={17} />
            </IconButton>
          </Tooltip>
          <TextField
            multiline
            maxRows={5}
            placeholder="Peça um briefing, análise, estratégia... ou arraste um arquivo"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            fullWidth
            size="small"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: 'grey.50', fontSize: '0.82rem' } }}
          />
          <IconButton
            onClick={handleSend}
            disabled={loading || (!input.trim() && attachedFiles.length === 0)}
            sx={{
              bgcolor: 'primary.main',
              color: '#fff',
              width: 34,
              height: 34,
              flexShrink: 0,
              '&:hover': { bgcolor: 'primary.dark' },
              '&.Mui-disabled': { bgcolor: 'grey.100', color: 'grey.300' },
            }}
          >
            <IconSend size={15} />
          </IconButton>
        </Stack>
      </Box>
    </Card>
  );
}
