'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { IconChartBar, IconFileAnalytics, IconSparkles } from '@tabler/icons-react';
import ClientPerformanceClient from '../performance/ClientPerformanceClient';
import ClientReportsPage from '../reports/page';
import ClientAnalyticsPage from '../analytics/page';

const SUB_TABS = [
  { label: 'Performance', icon: <IconChartBar size={16} /> },
  { label: 'Relatórios', icon: <IconFileAnalytics size={16} /> },
  { label: 'Analytics', icon: <IconSparkles size={16} /> },
];

export default function MetricasPage() {
  const params = useParams();
  const clientId = params.id as string;
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { minHeight: 44 } }}
      >
        {SUB_TABS.map((t, i) => (
          <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" sx={{ fontSize: '0.85rem' }} />
        ))}
      </Tabs>
      {tab === 0 && <ClientPerformanceClient clientId={clientId} />}
      {tab === 1 && <ClientReportsPage />}
      {tab === 2 && <ClientAnalyticsPage />}
    </Box>
  );
}
