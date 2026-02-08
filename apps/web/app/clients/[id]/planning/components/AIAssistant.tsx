'use client';

import { useEffect, useRef, useState } from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { IconFile, IconMessagePlus, IconPaperclip, IconRobot, IconSend, IconSparkles, IconX } from '@tabler/icons-react';

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
};

const QUICK_PROMPTS = [
  'Criar briefing para Instagram',
  'Gerar copy para o cliente',
  'Sugerir pilares de conteúdo',
  'Analisar oportunidades',
];

function formatTime(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function AIAssistant({
  messages,
  providers,
  selectedProvider,
  mode,
  loading,
  onSendMessage,
  onChangeProvider,
  onChangeMode,
  onNewConversation,
  contextLoaded,
}: AIAssistantProps) {
  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [collabStep, setCollabStep] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [messages, loading]);

  useEffect(() => {
    if (!loading || selectedProvider !== 'collaborative') {
      setCollabStep(0);
      return;
    }
    setCollabStep(0);
    const t1 = setTimeout(() => setCollabStep(1), 4000);
    const t2 = setTimeout(() => setCollabStep(2), 10000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [loading, selectedProvider]);

  const handleSend = () => {
    if ((!input.trim() && attachedFiles.length === 0) || loading) return;
    onSendMessage(input.trim(), attachedFiles.length > 0 ? attachedFiles : undefined);
    setInput('');
    setAttachedFiles([]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setAttachedFiles((prev) => [...prev, ...Array.from(files)]);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card
      variant="outlined"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}
      >
        <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.light', color: 'primary.main' }}>
          <IconRobot size={16} />
        </Avatar>
        <Typography variant="subtitle2" sx={{ flex: 1 }}>
          Assistente IA {contextLoaded && <Tooltip title="Contexto carregado"><span>✓</span></Tooltip>}
        </Typography>
        <Tabs
          value={mode}
          onChange={(_, v) => onChangeMode(v)}
          sx={{
            minHeight: 32,
            '& .MuiTab-root': { minHeight: 32, py: 0, px: 1.5, fontSize: '0.75rem' },
          }}
        >
          <Tab value="command" label="Comandos" />
          <Tab value="chat" label="Chat" />
        </Tabs>
        <TextField
          select
          value={selectedProvider}
          onChange={(e) => onChangeProvider(e.target.value)}
          size="small"
          sx={{
            minWidth: 100,
            '& .MuiInputBase-root': { fontSize: '0.75rem', height: 32 },
            '& .MuiSelect-select': { py: 0.5, px: 1 },
          }}
        >
          {providers.length ? (
            providers.map((opt) => (
              <MenuItem key={opt.id} value={opt.id} sx={{ fontSize: '0.75rem' }}>
                {opt.name}
              </MenuItem>
            ))
          ) : (
            <MenuItem value="openai" sx={{ fontSize: '0.75rem' }}>
              OpenAI
            </MenuItem>
          )}
        </TextField>
        <Tooltip title="Nova conversa">
          <IconButton size="small" onClick={onNewConversation}>
            <IconMessagePlus size={16} />
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
          gap: 1.5,
          bgcolor: 'grey.50',
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.300', borderRadius: 3 },
        }}
      >
        {messages.length === 0 && !loading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ flex: 1, py: 4 }}>
            <Avatar sx={{ width: 48, height: 48, bgcolor: 'primary.light', color: 'primary.main', mb: 2 }}>
              <IconRobot size={24} />
            </Avatar>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Como posso ajudar?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, textAlign: 'center', maxWidth: 260 }}>
              Crie briefings, gere copies e explore ideias para o cliente.
            </Typography>
            <Stack spacing={1} sx={{ width: '100%', maxWidth: 280 }}>
              {QUICK_PROMPTS.map((prompt) => (
                <Button
                  key={prompt}
                  variant="outlined"
                  size="small"
                  startIcon={<IconSparkles size={14} />}
                  onClick={() => setInput(prompt)}
                  sx={{
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    borderColor: 'divider',
                    color: 'text.secondary',
                    '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.light', color: 'primary.main' },
                  }}
                >
                  {prompt}
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
                alignItems="flex-end"
              >
                {msg.role === 'assistant' && (
                  <Avatar sx={{ width: 24, height: 24, bgcolor: 'grey.200', flexShrink: 0 }}>
                    <IconRobot size={14} />
                  </Avatar>
                )}
                <Box sx={{ maxWidth: '80%' }}>
                  <Box
                    sx={{
                      px: 1.75,
                      py: 1.25,
                      borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      bgcolor: msg.role === 'user' ? 'primary.main' : '#ffffff',
                      color: msg.role === 'user' ? '#ffffff' : 'text.primary',
                      boxShadow: msg.role === 'assistant' ? '0 1px 3px 0 rgba(0,0,0,0.05)' : 'none',
                      border: msg.role === 'assistant' ? '1px solid' : 'none',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                      {msg.content}
                    </Typography>
                  </Box>

                  {msg.action && msg.role === 'assistant' && (
                    <Box
                      sx={{
                        mt: 1,
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: msg.action.error ? 'error.light' : 'success.light',
                        border: '1px solid',
                        borderColor: msg.action.error ? 'error.main' : 'success.main',
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 600,
                          color: msg.action.error ? 'error.dark' : 'success.dark',
                          display: 'block',
                          mb: 0.5,
                        }}
                      >
                        {msg.action.error
                          ? 'Erro'
                          : msg.action.briefing
                            ? 'Briefing criado'
                            : msg.action.copy
                              ? 'Copy gerada'
                              : msg.action.action}
                      </Typography>
                      {msg.action.briefing && (
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {msg.action.briefing.title}
                        </Typography>
                      )}
                      {msg.action.copy?.preview && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ whiteSpace: 'pre-wrap', mt: 0.5, maxHeight: 80, overflow: 'hidden' }}
                        >
                          {msg.action.copy.preview}
                        </Typography>
                      )}
                      {msg.action.error && (
                        <Typography variant="body2" color="error.dark">
                          {msg.action.error}
                        </Typography>
                      )}
                    </Box>
                  )}

                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      mt: 0.5,
                      px: 0.5,
                      fontSize: '0.625rem',
                      color: 'text.disabled',
                      textAlign: msg.role === 'user' ? 'right' : 'left',
                    }}
                  >
                    {formatTime(msg.timestamp)}
                  </Typography>
                </Box>
              </Stack>
            ))}

            {loading && (
              <Stack direction="row" spacing={1} alignItems="flex-end">
                <Avatar sx={{ width: 24, height: 24, bgcolor: 'grey.200', flexShrink: 0 }}>
                  <IconRobot size={14} />
                </Avatar>
                <Box
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderRadius: '14px 14px 14px 4px',
                    bgcolor: '#ffffff',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  {selectedProvider === 'collaborative' ? (
                    <Box sx={{ minWidth: 240 }}>
                      <Stepper activeStep={collabStep} sx={{ mb: 1, '& .MuiStepLabel-label': { fontSize: '0.7rem' } }}>
                        <Step>
                          <StepLabel>Gemini — Analisando</StepLabel>
                        </Step>
                        <Step>
                          <StepLabel>OpenAI — Planejando</StepLabel>
                        </Step>
                        <Step>
                          <StepLabel>Claude — Refinando</StepLabel>
                        </Step>
                      </Stepper>
                      <LinearProgress
                        variant="indeterminate"
                        color={collabStep === 0 ? 'primary' : collabStep === 1 ? 'warning' : 'secondary'}
                        sx={{ height: 3, borderRadius: 1 }}
                      />
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      {[0, 1, 2].map((i) => (
                        <Box
                          key={i}
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            bgcolor: 'grey.400',
                            animation: 'chatBounce 1.4s infinite ease-in-out both',
                            animationDelay: `${i * 0.16}s`,
                            '@keyframes chatBounce': {
                              '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: 0.4 },
                              '40%': { transform: 'scale(1)', opacity: 1 },
                            },
                          }}
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              </Stack>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <Box sx={{ borderTop: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        {/* Attached files */}
        {attachedFiles.length > 0 && (
          <Stack direction="row" spacing={0.5} sx={{ px: 2, pt: 1.5, pb: 0, flexWrap: 'wrap', gap: 0.5 }}>
            {attachedFiles.map((file, idx) => (
              <Chip
                key={`${file.name}-${idx}`}
                icon={<IconFile size={14} />}
                label={file.name.length > 20 ? file.name.slice(0, 17) + '...' : file.name}
                size="small"
                onDelete={() => removeFile(idx)}
                deleteIcon={<IconX size={12} />}
                sx={{ fontSize: '0.7rem', height: 26 }}
              />
            ))}
          </Stack>
        )}
        <Stack
          direction="row"
          spacing={1}
          alignItems="flex-end"
          sx={{ px: 2, py: 1.5 }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx,.md,.json,.png,.jpg,.jpeg,.webp"
            onChange={handleFileSelect}
          />
          <Tooltip title="Anexar documento">
            <IconButton
              size="small"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              sx={{ flexShrink: 0 }}
            >
              <IconPaperclip size={18} />
            </IconButton>
          </Tooltip>
          <TextField
            multiline
            maxRows={3}
            placeholder={mode === 'command' ? 'Ex: Criar briefing para Instagram...' : 'Pergunte algo sobre o cliente...'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            fullWidth
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: 'grey.50' } }}
          />
          <IconButton
            onClick={handleSend}
            disabled={loading || (!input.trim() && attachedFiles.length === 0)}
            sx={{
              bgcolor: 'primary.main',
              color: '#ffffff',
              width: 36,
              height: 36,
              flexShrink: 0,
              '&:hover': { bgcolor: 'primary.dark' },
              '&.Mui-disabled': { bgcolor: 'grey.200', color: 'grey.400' },
            }}
          >
            <IconSend size={16} />
          </IconButton>
        </Stack>
      </Box>
    </Card>
  );
}
