'use client';
import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import {
  IconRobot, IconRefresh, IconCheck, IconX,
  IconAlertTriangle, IconTrendingUp, IconTrendingDown,
  IconCreditCard, IconBulb, IconTarget, IconStar,
} from '@tabler/icons-react';
import { apiGet, apiPost, apiPatch } from '@/lib/api';

type AlertType =
  | 'churn_risk' | 'upsell' | 'expand_services'
  | 'positive_momentum' | 'payment_risk' | 'engagement_drop' | 'opportunity';

type Priority = 'urgent' | 'high' | 'medium' | 'low';

type Alert = {
  id: string;
  alert_type: AlertType;
  priority: Priority;
  title: string;
  body: string;
  recommended_action: string;
  health_score: number | null;
  health_trend: string | null;
  roi_score: number | null;
  status: 'active' | 'dismissed' | 'actioned';
  computed_at: string;
};

const TYPE_CONFIG: Record<AlertType, { icon: React.ReactNode; color: string; label: string }> = {
  churn_risk:         { icon: <IconTrendingDown size={14} />,  color: '#FF4D4D', label: 'Risco de Churn' },
  payment_risk:       { icon: <IconCreditCard size={14} />,    color: '#FF4D4D', label: 'Risco Financeiro' },
  engagement_drop:    { icon: <IconAlertTriangle size={14} />, color: '#FFAE1F', label: 'Queda de Engajamento' },
  upsell:             { icon: <IconTrendingUp size={14} />,    color: '#13DEB9', label: 'Oportunidade Upsell' },
  expand_services:    { icon: <IconTarget size={14} />,        color: '#5D87FF', label: 'Ampliar Serviços' },
  opportunity:        { icon: <IconBulb size={14} />,          color: '#A855F7', label: 'Oportunidade' },
  positive_momentum:  { icon: <IconStar size={14} />,          color: '#F97316', label: 'Momento Positivo' },
};

const PRIORITY_CONFIG: Record<Priority, { color: string; label: string }> = {
  urgent: { color: '#FF4D4D', label: 'Urgente' },
  high:   { color: '#FFAE1F', label: 'Alta' },
  medium: { color: '#5D87FF', label: 'Média' },
  low:    { color: '#888',    label: 'Baixa' },
};

export default function AccountManagerPanel({ clientId }: { clientId: string }) {
  const [alerts, setAlerts]       = useState<Alert[]>([]);
  const [loading, setLoading]     = useState(true);
  const [computing, setComputing] = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => { loadAlerts(); }, [clientId]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ alerts: Alert[] }>(`/clients/${clientId}/account-manager/alerts`);
      setAlerts(res.alerts || []);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  const computeAlerts = async () => {
    setComputing(true);
    setError('');
    try {
      const res = await apiPost<{ alerts: Alert[] }>(`/clients/${clientId}/account-manager/compute`, {});
      setAlerts(res.alerts || []);
    } catch (e: any) {
      setError(e?.message || 'Erro ao gerar alertas.');
    } finally {
      setComputing(false);
    }
  };

  const handleAction = async (alertId: string, action: 'actioned' | 'dismissed') => {
    try {
      await apiPatch(`/clients/${clientId}/account-manager/alerts/${alertId}`, { action });
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch { /* silent */ }
  };

  const urgentCount = alerts.filter((a) => a.priority === 'urgent' || a.priority === 'high').length;

  return (
    <Card variant="outlined" sx={{ mb: 3, border: urgentCount > 0 ? '1px solid #FF4D4D44' : undefined }}>
      <CardContent sx={{ pb: '16px !important' }}>
        {/* Header */}
        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconRobot size={20} color="#A855F7" />
            <Typography variant="h6" fontWeight={700} color="#A855F7">
              AI Account Manager
            </Typography>
            {urgentCount > 0 && (
              <Chip
                size="small"
                label={`${urgentCount} urgente${urgentCount > 1 ? 's' : ''}`}
                sx={{ bgcolor: '#FF4D4D', color: '#fff', fontWeight: 700, fontSize: '0.6rem', height: 20 }}
              />
            )}
            {alerts.length > 0 && urgentCount === 0 && (
              <Chip size="small" label={`${alerts.length} alerta${alerts.length > 1 ? 's' : ''}`}
                sx={{ fontSize: '0.62rem', height: 20 }} />
            )}
          </Stack>
          <Button
            size="small" variant="outlined"
            onClick={computeAlerts} disabled={computing}
            startIcon={computing ? <CircularProgress size={12} /> : <IconRefresh size={13} />}
            sx={{ borderColor: '#A855F744', color: '#A855F7', textTransform: 'none', fontSize: '0.65rem' }}
          >
            {computing ? 'Analisando…' : alerts.length ? 'Reanalisar' : 'Analisar Cliente'}
          </Button>
        </Stack>

        {error && (
          <Typography sx={{ mb: 1.5, fontSize: '0.75rem', color: '#FF4D4D' }}>{error}</Typography>
        )}

        {loading ? (
          <Stack alignItems="center" sx={{ py: 2 }}>
            <CircularProgress size={24} sx={{ color: '#A855F7' }} />
          </Stack>
        ) : alerts.length === 0 ? (
          <Box sx={{ py: 1.5, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Nenhum alerta ativo. Clique em "Analisar Cliente" para que a IA avalie os sinais deste cliente.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.25}>
            {alerts.map((alert, i) => {
              const typeCfg = TYPE_CONFIG[alert.alert_type] || TYPE_CONFIG.opportunity;
              const priCfg  = PRIORITY_CONFIG[alert.priority];
              return (
                <Box key={alert.id}>
                  {i > 0 && <Divider sx={{ borderColor: '#1e1e1e', mb: 1.25 }} />}
                  <Stack spacing={0.75}>
                    {/* Type + Priority chips */}
                    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                      <Chip
                        size="small"
                        icon={typeCfg.icon as any}
                        label={typeCfg.label}
                        sx={{ height: 20, fontSize: '0.6rem', bgcolor: `${typeCfg.color}22`,
                          color: typeCfg.color, border: `1px solid ${typeCfg.color}44`, fontWeight: 600 }}
                      />
                      <Chip
                        size="small"
                        label={priCfg.label}
                        sx={{ height: 18, fontSize: '0.58rem', bgcolor: `${priCfg.color}22`,
                          color: priCfg.color, fontWeight: 700 }}
                      />
                      {alert.health_score !== null && (
                        <Typography sx={{ fontSize: '0.6rem', color: '#555' }}>
                          Saúde: {alert.health_score}/100
                          {alert.health_trend === 'down' ? ' ↓' : alert.health_trend === 'up' ? ' ↑' : ''}
                        </Typography>
                      )}
                    </Stack>

                    {/* Title */}
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}>
                      {alert.title}
                    </Typography>

                    {/* Body */}
                    <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.5 }}>
                      {alert.body}
                    </Typography>

                    {/* Recommended action */}
                    <Box sx={{
                      p: 1, borderRadius: 1, bgcolor: `${typeCfg.color}0D`,
                      border: `1px solid ${typeCfg.color}22`,
                    }}>
                      <Typography sx={{ fontSize: '0.72rem', color: typeCfg.color, fontWeight: 600, lineHeight: 1.4 }}>
                        ▶ {alert.recommended_action}
                      </Typography>
                    </Box>

                    {/* Actions */}
                    <Stack direction="row" spacing={0.75}>
                      <Tooltip title="Marcar como executado">
                        <Button
                          size="small" variant="outlined"
                          onClick={() => handleAction(alert.id, 'actioned')}
                          startIcon={<IconCheck size={12} />}
                          sx={{ textTransform: 'none', fontSize: '0.62rem', flex: 1,
                            borderColor: '#13DEB944', color: '#13DEB9',
                            '&:hover': { borderColor: '#13DEB9', bgcolor: 'rgba(19,222,185,0.06)' } }}
                        >
                          Executado
                        </Button>
                      </Tooltip>
                      <Tooltip title="Dispensar alerta">
                        <Button
                          size="small" variant="outlined"
                          onClick={() => handleAction(alert.id, 'dismissed')}
                          startIcon={<IconX size={12} />}
                          sx={{ textTransform: 'none', fontSize: '0.62rem',
                            borderColor: '#55555544', color: '#555',
                            '&:hover': { borderColor: '#888', bgcolor: 'rgba(136,136,136,0.05)' } }}
                        >
                          Dispensar
                        </Button>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
