'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { IconBrain, IconCalendarStats, IconBulb } from '@tabler/icons-react';
import EstrategiaTier1Client from './EstrategiaTier1Client';
import EstrategiaMesClient from './EstrategiaMesClient';
import BigIdeiaPanel from './BigIdeiaPanel';
import { useJarvisPage } from '@/hooks/useJarvisPage';
import AskJarvisButton from '@/components/jarvis/AskJarvisButton';

type Props = { clientId: string };

const TABS = [
  { value: 'tier1', label: 'DNA do Cliente',  icon: <IconBrain size={16} /> },
  { value: 'mes',   label: 'Estratégia do Mês', icon: <IconCalendarStats size={16} /> },
  { value: 'bigideia', label: 'Big Idea',      icon: <IconBulb size={16} /> },
];

export default function EstrategiaClient({ clientId }: Props) {
  const [tab, setTab] = useState('tier1');

  useJarvisPage({
    screen: 'client_estrategia',
    clientId,
    activeTab: tab,
  }, [clientId, tab]);

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
            Estratégia Edro OS
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Três camadas de contexto estratégico que guiam toda a criação do Jarvis.
          </Typography>
        </Box>
        <AskJarvisButton
          message="Analisa a estratégia atual deste cliente e sugere como evoluir a maturidade criativa."
          label="Consultar Jarvis"
          tooltip="Pede ao Jarvis para analisar a estratégia"
        />
      </Stack>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        {TABS.map((t) => (
          <Tab
            key={t.value}
            value={t.value}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                {t.icon}
                {t.label}
              </Box>
            }
          />
        ))}
      </Tabs>

      {tab === 'tier1'    && <EstrategiaTier1Client clientId={clientId} />}
      {tab === 'mes'      && <EstrategiaMesClient   clientId={clientId} />}
      {tab === 'bigideia' && <BigIdeiaPanel         clientId={clientId} />}
    </Box>
  );
}
