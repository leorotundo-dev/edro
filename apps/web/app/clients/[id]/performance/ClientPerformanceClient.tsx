'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { IconExternalLink, IconPlugConnected, IconSettings } from '@tabler/icons-react';
import { getReporteiEmbedUrl, isReporteiConfigured } from '@/lib/reportei';

type ClientPerformanceClientProps = {
  clientId: string;
};

export default function ClientPerformanceClient({ clientId }: ClientPerformanceClientProps) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [connectorConfigured, setConnectorConfigured] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadConnector = useCallback(async () => {
    try {
      const res = await apiGet<{ payload?: Record<string, any> } | null>(
        `/clients/${clientId}/connectors/reportei`
      );
      const payload = res?.payload || null;
      setConnectorConfigured(isReporteiConfigured(payload));
      setEmbedUrl(getReporteiEmbedUrl(payload) || null);
    } catch {
      setConnectorConfigured(false);
      setEmbedUrl(null);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadConnector();
  }, [loadConnector]);

  if (loading) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 400 }}>
        <CircularProgress size={28} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Carregando performance...
        </Typography>
      </Stack>
    );
  }

  if (!embedUrl) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Stack alignItems="center" spacing={2} sx={{ py: 6 }}>
            <IconPlugConnected size={40} stroke={1.5} color="#94a3b8" />
            <Typography variant="h6">
              {connectorConfigured ? 'Dashboard do Reportei indisponível' : 'Reportei não configurado'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 380 }}>
              {connectorConfigured
                ? 'O conector Reportei está ativo, mas este cliente ainda não tem um link de dashboard/embed salvo. As métricas continuam acessíveis pela aba de métricas.'
                : 'Para visualizar o dashboard de performance, configure a integração com o Reportei na página de conectores e preencha o campo Embed URL.'}
            </Typography>
            <Button
              variant="contained"
              startIcon={<IconExternalLink size={16} />}
              href={`/clients/${clientId}/identidade?sub=config`}
            >
              Configurar integrações
            </Button>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ width: '100%', height: 'calc(100vh - 200px)', minHeight: 600, position: 'relative' }}>
      <Tooltip title="Configurar conector Reportei">
        <IconButton
          component="a"
          href={`/clients/${clientId}/identidade?sub=config`}
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 10,
            bgcolor: 'background.paper',
            boxShadow: 1,
            '&:hover': { bgcolor: 'grey.100' },
          }}
        >
          <IconSettings size={18} />
        </IconButton>
      </Tooltip>
      <Box
        component="iframe"
        title="Reportei Dashboard"
        src={embedUrl}
        allow="fullscreen"
        sx={{ width: '100%', height: '100%', border: 'none', borderRadius: 3 }}
      />
    </Box>
  );
}
