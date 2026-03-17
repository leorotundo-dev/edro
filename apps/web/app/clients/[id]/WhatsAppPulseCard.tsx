'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconBrandWhatsapp, IconMessageCircle, IconBulb,
  IconAlertTriangle, IconMoodHappy, IconMoodSad,
  IconMoodSmile, IconArrowRight, IconRefresh,
} from '@tabler/icons-react';

const WA_GREEN = '#25D366';
const WA_BG = '#f0fdf4';
const WA_BORDER = '#bbf7d0';

type PulseData = {
  has_groups: boolean;
  groups: Array<{ id: string; name: string; last_activity: string | null }>;
  message_count_7d: number;
  insight_count_7d: number;
  pending_confirmations: number;
  summary: string | null;
  topics: string[];
  sentiment: string | null;
  pending_actions: string[];
  last_activity: string | null;
};

const SENTIMENT_MAP: Record<string, { icon: any; label: string; color: string }> = {
  positivo: { icon: IconMoodHappy, label: 'Positivo', color: '#16a34a' },
  neutro: { icon: IconMoodSmile, label: 'Neutro', color: '#6b7280' },
  negativo: { icon: IconMoodSad, label: 'Negativo', color: '#dc2626' },
  misto: { icon: IconMoodSmile, label: 'Misto', color: '#d97706' },
};

function normalizePulseItem(item: unknown): string {
  if (typeof item === 'string') return item;
  if (!item || typeof item !== 'object') return '';

  const data = item as Record<string, unknown>;

  if (typeof data.decision === 'string' && data.decision.trim()) {
    const context = typeof data.context === 'string' && data.context.trim()
      ? ` (${data.context.trim()})`
      : '';
    const date = typeof data.date === 'string' && data.date.trim()
      ? ` · ${data.date.trim()}`
      : '';
    return `${data.decision.trim()}${context}${date}`;
  }

  if (typeof data.action === 'string' && data.action.trim()) {
    const owner = typeof data.owner === 'string' && data.owner.trim()
      ? ` (${data.owner.trim()})`
      : '';
    const deadline = typeof data.deadline === 'string' && data.deadline.trim()
      ? ` · prazo: ${data.deadline.trim()}`
      : '';
    return `${data.action.trim()}${owner}${deadline}`;
  }

  if (typeof data.summary === 'string' && data.summary.trim()) {
    return data.summary.trim();
  }

  return '';
}

export default function WhatsAppPulseCard({ clientId }: { clientId: string }) {
  const [data, setData] = useState<PulseData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiGet<any>(`/clients/${clientId}/whatsapp-pulse`);
      setData({
        ...res,
        topics: Array.isArray(res?.topics) ? res.topics.map(normalizePulseItem).filter(Boolean) : [],
        pending_actions: Array.isArray(res?.pending_actions) ? res.pending_actions.map(normalizePulseItem).filter(Boolean) : [],
        groups: Array.isArray(res?.groups) ? res.groups : [],
      });
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [clientId]);

  if (loading) {
    return (
      <Card sx={{ border: `1px solid ${WA_BORDER}`, bgcolor: WA_BG }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack spacing={1.5}>
            <Skeleton variant="text" width={200} height={28} />
            <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (!data?.has_groups) {
    return (
      <Card sx={{ border: '1px dashed #d1d5db', bgcolor: '#fafafa' }}>
        <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
          <IconBrandWhatsapp size={28} color="#9ca3af" style={{ marginBottom: 4 }} />
          <Typography variant="body2" color="text.secondary">
            Nenhum grupo de WhatsApp linkado
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Conecte em Configurações &gt; WhatsApp Groups
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const sentiment = data.sentiment ? SENTIMENT_MAP[data.sentiment] : null;
  const SentimentIcon = sentiment?.icon ?? IconMoodSmile;

  return (
    <Card sx={{
      border: `1px solid ${WA_BORDER}`,
      bgcolor: WA_BG,
      position: 'relative',
      overflow: 'visible',
    }}>
      <CardContent sx={{ p: 2.5 }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconBrandWhatsapp size={20} color={WA_GREEN} />
            <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#166534' }}>
              Pulso do WhatsApp
            </Typography>
            {sentiment && (
              <Chip
                icon={<SentimentIcon size={14} />}
                label={sentiment.label}
                size="small"
                sx={{
                  height: 22, fontSize: '0.65rem', fontWeight: 600,
                  bgcolor: `${sentiment.color}15`, color: sentiment.color,
                  '& .MuiChip-icon': { color: sentiment.color },
                }}
              />
            )}
          </Stack>
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Atualizar">
              <IconButton size="small" onClick={load} sx={{ color: '#6b7280' }}>
                <IconRefresh size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Ver grupos">
              <IconButton
                size="small"
                component={Link}
                href={`/clients/${clientId}/whatsapp`}
                sx={{ color: WA_GREEN }}
              >
                <IconArrowRight size={16} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        {/* Stats row */}
        <Stack direction="row" spacing={3} sx={{ mb: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <IconMessageCircle size={14} color="#6b7280" />
            <Typography variant="caption" fontWeight={600} color="text.secondary">
              {data.message_count_7d} msgs (7d)
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <IconBulb size={14} color="#6b7280" />
            <Typography variant="caption" fontWeight={600} color="text.secondary">
              {data.insight_count_7d} insights
            </Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {data.groups.length} grupo{data.groups.length > 1 ? 's' : ''}
          </Typography>
        </Stack>

        {/* AI Summary */}
        {data.summary && (
          <Box sx={{
            p: 1.5, borderRadius: 1.5,
            bgcolor: '#ffffff', border: '1px solid #dcfce7',
            mb: 1.5,
          }}>
            <Typography variant="body2" sx={{ color: '#1f2937', lineHeight: 1.6, fontSize: '0.82rem' }}>
              {data.summary}
            </Typography>
          </Box>
        )}

        {/* Topics */}
        {data.topics.length > 0 && (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
            {data.topics.map((rawTopic, i) => {
              const topic = String(rawTopic ?? '');
              return (
                <Chip
                  key={i}
                  label={topic}
                  size="small"
                  sx={{
                    height: 22, fontSize: '0.65rem',
                    bgcolor: topic.startsWith('⚠️') ? '#fef3c7' : '#e0f2fe',
                    color: topic.startsWith('⚠️') ? '#92400e' : '#0369a1',
                    fontWeight: topic.startsWith('⚠️') ? 700 : 500,
                  }}
                />
              );
            })}
          </Stack>
        )}

        {/* Pending actions */}
        {data.pending_actions.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Stack spacing={0.5}>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <IconAlertTriangle size={14} color="#d97706" />
                <Typography variant="caption" fontWeight={700} sx={{ color: '#92400e' }}>
                  Ações pendentes
                </Typography>
              </Stack>
              {data.pending_actions.map((action, i) => (
                <Typography key={i} variant="caption" sx={{ color: '#6b7280', pl: 2.5, lineHeight: 1.4 }}>
                  • {action}
                </Typography>
              ))}
            </Stack>
          </>
        )}

        {(data.pending_confirmations ?? 0) > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Tooltip title="Revisar interpretações de IA do WhatsApp — confirmar as corretas gera regras permanentes para o cliente">
              <Chip
                component={Link}
                href={`/clients/${clientId}/whatsapp`}
                size="small"
                icon={<IconBulb size={12} />}
                label={`${data.pending_confirmations} insight${data.pending_confirmations !== 1 ? 's' : ''} para confirmar`}
                clickable
                sx={{
                  bgcolor: 'rgba(37,211,102,0.1)', color: WA_GREEN,
                  fontWeight: 700, fontSize: '0.68rem',
                  border: `1px solid rgba(37,211,102,0.25)`,
                  '& .MuiChip-icon': { color: WA_GREEN },
                }}
              />
            </Tooltip>
          </>
        )}
      </CardContent>
    </Card>
  );
}
