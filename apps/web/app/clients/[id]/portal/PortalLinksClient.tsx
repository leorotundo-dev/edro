'use client';
import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AppShell from '@/components/AppShell';
import { IconCopy, IconExternalLink, IconLink, IconQrcode, IconTrash } from '@tabler/icons-react';

type PortalLink = {
  id: string;
  token: string;
  url: string;
  label: string;
  expires_at?: string;
  last_used_at?: string;
  created_at: string;
};

export default function PortalLinksClient({ clientId }: { clientId: string }) {
  const [links, setLinks] = useState<PortalLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [label, setLabel] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [newLink, setNewLink] = useState<PortalLink | null>(null);

  const loadLinks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ links: PortalLink[] }>(`/portal/links/${clientId}`);
      setLinks(res?.links ?? []);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { loadLinks(); }, [loadLinks]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await apiPost<PortalLink>(`/portal/invite/${clientId}`, {
        label: label.trim() || undefined,
        expiresInDays: 90,
      });
      if (res) {
        setNewLink(res);
        setLabel('');
        loadLinks();
      }
    } catch (e: any) {
      setError(e.message ?? 'Erro ao gerar link.');
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (tokenId: string) => {
    if (!confirm('Revogar este link? O cliente não conseguirá mais acessar com ele.')) return;
    await apiDelete(`/portal/links/${tokenId}`);
    loadLinks();
  };

  const copyToClipboard = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const isExpired = (expiresAt?: string) =>
    expiresAt ? new Date(expiresAt) < new Date() : false;

  return (
    <AppShell title="Portal do Cliente">
      <Box sx={{ maxWidth: 720, mx: 'auto', py: 3, px: { xs: 2, md: 3 } }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
          <Box sx={{ p: 1, bgcolor: 'primary.main', borderRadius: 1.5 }}>
            <IconLink size={20} color="#fff" />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>Portal do Cliente</Typography>
            <Typography variant="body2" color="text.secondary">
              Gere links mágicos para que o cliente acesse o portal sem precisar fazer login.
            </Typography>
          </Box>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

        {/* Generator */}
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>Gerar Novo Link</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                size="small"
                fullWidth
                placeholder='Rótulo opcional — ex: "Link março 2026"'
                value={label}
                onChange={e => setLabel(e.target.value)}
              />
              <Button
                variant="contained"
                startIcon={generating ? <CircularProgress size={14} color="inherit" /> : <IconQrcode size={16} />}
                disabled={generating}
                onClick={handleGenerate}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Gerar Link
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              O link gerado expira em 90 dias e pode ser revogado a qualquer momento.
            </Typography>
          </CardContent>
        </Card>

        {/* Links list */}
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
          Links Ativos
        </Typography>

        {loading ? (
          <Stack alignItems="center" py={4}><CircularProgress size={24} /></Stack>
        ) : links.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Nenhum link gerado ainda.</Typography>
        ) : (
          <Stack spacing={1.5}>
            {links.map(link => {
              const expired = isExpired(link.expires_at);
              return (
                <Card
                  key={link.id}
                  variant="outlined"
                  sx={{ opacity: expired ? 0.6 : 1 }}
                >
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>{link.label}</Typography>
                          {expired && <Chip label="Expirado" size="small" color="error" sx={{ fontSize: '0.6rem' }} />}
                          {link.last_used_at && !expired && (
                            <Chip label="Usado" size="small" color="success" sx={{ fontSize: '0.6rem' }} />
                          )}
                        </Stack>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {link.url}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                          Criado em {new Date(link.created_at).toLocaleDateString('pt-BR')}
                          {link.expires_at && ` · Expira em ${new Date(link.expires_at).toLocaleDateString('pt-BR')}`}
                          {link.last_used_at && ` · Último acesso ${new Date(link.last_used_at).toLocaleString('pt-BR')}`}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <IconButton
                          size="small"
                          title={copied === link.id ? 'Copiado!' : 'Copiar URL'}
                          onClick={() => copyToClipboard(link.url, link.id)}
                          sx={{ color: copied === link.id ? 'success.main' : 'text.secondary' }}
                        >
                          <IconCopy size={16} />
                        </IconButton>
                        <IconButton
                          size="small"
                          title="Abrir portal"
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ color: 'text.secondary' }}
                        >
                          <IconExternalLink size={16} />
                        </IconButton>
                        <IconButton
                          size="small"
                          title="Revogar"
                          onClick={() => handleRevoke(link.id)}
                          sx={{ color: 'error.main' }}
                        >
                          <IconTrash size={16} />
                        </IconButton>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}

        <Divider sx={{ my: 3 }} />

        {/* Instructions */}
        <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
          <CardContent>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Como funciona</Typography>
            <Typography variant="body2" color="text.secondary" component="div">
              <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 2.2 }}>
                <li>Clique em <strong>Gerar Link</strong> acima.</li>
                <li>Copie a URL gerada e envie ao cliente por email ou WhatsApp.</li>
                <li>O cliente acessa o link e vê o portal com todos os jobs, aprovações e relatórios.</li>
                <li>Pedidos enviados pelo portal chegam automaticamente ao Jarvis como briefings.</li>
              </ol>
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* New link dialog */}
      <Dialog open={!!newLink} onClose={() => setNewLink(null)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Link gerado com sucesso!</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Envie este link ao cliente. Ele expira em 90 dias.
          </Typography>
          <Box
            sx={{
              bgcolor: 'action.hover',
              borderRadius: 1,
              p: 1.5,
              fontFamily: 'monospace',
              fontSize: '0.82rem',
              wordBreak: 'break-all',
              userSelect: 'all',
            }}
          >
            {newLink?.url}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { copyToClipboard(newLink?.url ?? '', 'dialog'); setNewLink(null); }} variant="contained">
            Copiar e fechar
          </Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  );
}
