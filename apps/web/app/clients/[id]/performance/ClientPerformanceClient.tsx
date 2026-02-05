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

type ClientPerformanceClientProps = {
  clientId: string;
};

export default function ClientPerformanceClient({ clientId }: ClientPerformanceClientProps) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadConnector = useCallback(async () => {
    try {
      const res = await apiGet<{ payload?: Record<string, any> } | null>(
        `/clients/${clientId}/connectors/reportei`
      );
      let url = res?.payload?.embed_url || null;
      // Extract URL from iframe tag if user pasted the full embed code
      if (url && url.includes('<iframe')) {
        const match = url.match(/src="([^"]+)"/);
        if (match?.[1]) url = match[1];
      }
      setEmbedUrl(url);
    } catch {
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
            <Typography variant="h6">Reportei nao configurado</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 380 }}>
              Para visualizar o dashboard de performance, configure a integracao com o Reportei na pagina de conectores e preencha o campo Embed URL.
            </Typography>
            <Button
              variant="contained"
              startIcon={<IconExternalLink size={16} />}
              href={`/clients/${clientId}/connectors`}
            >
              Configurar conectores
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
          href={`/clients/${clientId}/connectors`}
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
