'use client';

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import OperationsShell from '@/components/operations/OperationsShell';
import CalibracaoClient from '../calibracao/CalibracaoClient';
import SlaClient from '../sla/SlaClient';

type QualityTab = 'sla' | 'calibracao';

const TABS: Array<{ key: QualityTab; label: string; subtitle: string }> = [
  { key: 'sla', label: 'SLA', subtitle: 'Entrega no prazo por cliente e responsável' },
  { key: 'calibracao', label: 'Calibração', subtitle: 'Estimativa vs tempo real da operação' },
];

export default function QualidadeWorkspaceClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab: QualityTab = searchParams.get('tab') === 'calibracao' ? 'calibracao' : 'sla';

  const currentMeta = useMemo(
    () => TABS.find((tab) => tab.key === currentTab) ?? TABS[0],
    [currentTab]
  );

  const handleTabChange = (next: QualityTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'sla') params.delete('tab');
    else params.set('tab', next);
    const qs = params.toString();
    router.replace(qs ? `/admin/operacoes/qualidade?${qs}` : '/admin/operacoes/qualidade', { scroll: false });
  };

  return (
    <OperationsShell
      section="quality"
      summary={
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
          <Typography variant="caption" fontWeight={800} color="text.secondary">
            Governança operacional
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {currentMeta.subtitle}
          </Typography>
        </Stack>
      }
    >
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h6" fontWeight={900} sx={{ mb: 0.5 }}>
            Qualidade da operação
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Use esta área para entender se a agência está entregando no prazo e estimando com precisão.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {TABS.map((tab) => (
            <Button
              key={tab.key}
              variant={currentTab === tab.key ? 'contained' : 'outlined'}
              onClick={() => handleTabChange(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </Stack>

        {currentTab === 'sla' ? <SlaClient embedded /> : <CalibracaoClient embedded />}
      </Stack>
    </OperationsShell>
  );
}
