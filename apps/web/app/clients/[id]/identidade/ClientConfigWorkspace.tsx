'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { IconPlugConnected, IconSettings, IconShieldCheck } from '@tabler/icons-react';
import ClientConnectorsPage from '../connectors/page';
import ClientPermissionsPage from '../permissions/page';

type ConfigWorkspaceTab = 'connectors' | 'permissions';

const CONFIG_TABS = [
  {
    value: 'connectors' as const,
    label: 'Conectores',
    icon: <IconPlugConnected size={16} />,
    eyebrow: 'Integrações ativas',
    title: 'Onde este cliente se conecta à Edro',
    body: 'Relacione Reportei, Meta, WhatsApp, Ads e outros providers que alimentam performance, social listening e publicação.',
  },
  {
    value: 'permissions' as const,
    label: 'Permissões',
    icon: <IconShieldCheck size={16} />,
    eyebrow: 'Acesso do time',
    title: 'Quem pode mexer neste cliente',
    body: 'Controle leitura, escrita, revisão e publicação sem misturar isso com setup técnico de integração.',
  },
];

export default function ClientConfigWorkspace() {
  const [tab, setTab] = useState<ConfigWorkspaceTab>('connectors');
  const activeTab = CONFIG_TABS.find((item) => item.value === tab) ?? CONFIG_TABS[0];

  return (
    <Stack spacing={3}>
      <Card
        variant="outlined"
        sx={{
          borderRadius: 3,
          background:
            'linear-gradient(135deg, rgba(232,82,25,0.10) 0%, rgba(232,82,25,0.03) 55%, rgba(15,23,42,0.02) 100%)',
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  boxShadow: '0 12px 24px rgba(232,82,25,0.20)',
                }}
              >
                <IconSettings size={22} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="overline" color="primary.main" sx={{ fontWeight: 800, letterSpacing: 0.8 }}>
                  Configurações do cliente
                </Typography>
                <Typography variant="h5" fontWeight={800}>
                  Conecte plataformas e defina quem opera este cliente
                </Typography>
              </Box>
            </Stack>

            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Conectores e permissões vivem juntos, mas têm funções diferentes: um lado liga sistemas; o outro controla acesso humano.
            </Alert>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip icon={<IconPlugConnected size={14} />} label="Conectores" color={tab === 'connectors' ? 'primary' : 'default'} />
              <Chip icon={<IconShieldCheck size={14} />} label="Permissões" color={tab === 'permissions' ? 'primary' : 'default'} />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Tabs
            value={tab}
            onChange={(_, value) => setTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { minHeight: 44 } }}
          >
            {CONFIG_TABS.map((item) => (
              <Tab key={item.value} value={item.value} label={item.label} icon={item.icon} iconPosition="start" />
            ))}
          </Tabs>

          <Stack spacing={0.75} sx={{ mb: 3 }}>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.8 }}>
              {activeTab.eyebrow}
            </Typography>
            <Typography variant="h6" fontWeight={800}>
              {activeTab.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {activeTab.body}
            </Typography>
          </Stack>

          {tab === 'connectors' ? <ClientConnectorsPage embedded /> : <ClientPermissionsPage embedded />}
        </CardContent>
      </Card>
    </Stack>
  );
}
