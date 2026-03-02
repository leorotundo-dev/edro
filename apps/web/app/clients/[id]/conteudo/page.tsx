'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { IconCalendar, IconClipboardList, IconLayoutKanban, IconTargetArrow } from '@tabler/icons-react';
import ClientBriefingsClient from '../briefings/ClientBriefingsClient';
import CampaignsClient from '../campaigns/CampaignsClient';
import ClientCalendarClient from '../calendar/ClientCalendarClient';
import PlanningClient from '../planning/PlanningClient';

type SubTab = 'briefings' | 'campanhas' | 'calendario' | 'planejamento';

const SUB_TABS = [
  { value: 'briefings' as const,    label: 'Briefings',    icon: <IconClipboardList size={16} /> },
  { value: 'campanhas' as const,    label: 'Campanhas',    icon: <IconTargetArrow size={16} /> },
  { value: 'calendario' as const,   label: 'Calendário',   icon: <IconCalendar size={16} /> },
  { value: 'planejamento' as const, label: 'Planejamento', icon: <IconLayoutKanban size={16} /> },
];

function parseSubTab(value: string | null): SubTab {
  if (value === 'campanhas') return 'campanhas';
  if (value === 'calendario') return 'calendario';
  if (value === 'planejamento') return 'planejamento';
  return 'briefings';
}

export default function ConteudoPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = params.id as string;
  const [tab, setTab] = useState<SubTab>(() => parseSubTab(searchParams.get('sub')));

  useEffect(() => {
    setTab(parseSubTab(searchParams.get('sub')));
  }, [searchParams]);

  const changeTab = (value: SubTab) => {
    setTab(value);
    const next = new URLSearchParams(searchParams.toString());
    if (value === 'briefings') {
      next.delete('sub');
    } else {
      next.set('sub', value);
    }
    const qs = next.toString();
    router.replace(qs ? `/clients/${clientId}/conteudo?${qs}` : `/clients/${clientId}/conteudo`);
  };

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_, v) => changeTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { minHeight: 44 } }}
      >
        {SUB_TABS.map((t) => (
          <Tab key={t.value} value={t.value} label={t.label} icon={t.icon} iconPosition="start" sx={{ fontSize: '0.85rem' }} />
        ))}
      </Tabs>

      {tab === 'briefings'    && <ClientBriefingsClient clientId={clientId} />}
      {tab === 'campanhas'    && <CampaignsClient clientId={clientId} />}
      {tab === 'calendario'   && <ClientCalendarClient clientId={clientId} />}
      {tab === 'planejamento' && <PlanningClient clientId={clientId} />}
    </Box>
  );
}
