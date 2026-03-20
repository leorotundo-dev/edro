'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { alpha } from '@mui/material/styles';
import { IconBrandWhatsapp, IconMicrophone, IconArrowRight } from '@tabler/icons-react';

const TABS = [
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    icon: <IconBrandWhatsapp size={18} />,
    href: '/whatsapp',
    color: '#25D366',
    description: 'Inbox de conversas com clientes via WhatsApp. Jarvis lê e contextualiza automaticamente.',
  },
  {
    key: 'reunioes',
    label: 'Reuniões',
    icon: <IconMicrophone size={18} />,
    href: '/admin/reunioes',
    color: '#5D87FF',
    description: 'Gravações e transcrições analisadas pelo Jarvis. Ações extraídas ficam disponíveis em Jarvis › Propostas.',
  },
] as const;

export default function ComunicacoesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams?.get('tab') ?? 'whatsapp';

  const active = TABS.find((t) => t.key === tab) ?? TABS[0];

  useEffect(() => {
    // Redirect directly to the active channel page
    router.push(active.href);
  }, [active.href, router]);

  // Render hub while redirect happens
  return (
    <AppShell title="Comunicações">
      <Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Comunicações
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 560 }}>
          Todos os canais de entrada que o Jarvis monitora em tempo real. Selecione um canal para visualizar ou interagir.
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          {TABS.map((t) => (
            <Card
              key={t.key}
              sx={{
                flex: 1,
                border: `1.5px solid ${alpha(t.color, 0.25)}`,
                bgcolor: alpha(t.color, 0.04),
                transition: 'all 150ms ease',
                '&:hover': { borderColor: alpha(t.color, 0.55), bgcolor: alpha(t.color, 0.08) },
              }}
            >
              <CardActionArea component={Link} href={t.href} sx={{ p: 0 }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1.25} mb={1.5}>
                    <Box sx={{ color: t.color, display: 'flex' }}>{t.icon}</Box>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ color: t.color }}>
                      {t.label}
                    </Typography>
                    <Box sx={{ ml: 'auto !important', color: t.color, display: 'flex' }}>
                      <IconArrowRight size={16} />
                    </Box>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
                    {t.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      </Box>
    </AppShell>
  );
}
