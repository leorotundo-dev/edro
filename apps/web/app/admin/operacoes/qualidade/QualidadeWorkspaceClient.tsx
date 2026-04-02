'use client';

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import {
  IconAlertTriangle,
  IconChecklist,
  IconClockCheck,
  IconScale,
} from '@tabler/icons-react';
import OperationsShell from '@/components/operations/OperationsShell';
import CalibracaoClient from '../calibracao/CalibracaoClient';
import SlaClient from '../sla/SlaClient';

type QualityTab = 'sla' | 'calibracao';

const TABS: Array<{ key: QualityTab; label: string; subtitle: string }> = [
  { key: 'sla', label: 'Prazo', subtitle: 'Quem está entregando no prazo e onde a operação está derrapando' },
  { key: 'calibracao', label: 'Estimativa', subtitle: 'Onde a agência está subestimando ou superestimando esforço' },
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
          <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Mesa da qualidade
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 420 }}>
            {currentMeta.subtitle}
          </Typography>
        </Stack>
      }
    >
      <Stack spacing={2.5}>
        <Box
          sx={(theme) => ({
            p: 2.25,
            borderRadius: 2.5,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.02) : alpha(theme.palette.common.black, 0.015),
          })}
        >
          <Stack spacing={1.75}>
            <Box>
              <Typography variant="overline" sx={{ fontWeight: 900, color: 'warning.main', letterSpacing: '0.12em', lineHeight: 1 }}>
                QUALIDADE DA OPERAÇÃO
              </Typography>
              <Typography variant="h6" fontWeight={900} sx={{ mt: 0.5 }}>
                Onde a agência está acertando e onde está escorregando
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 780 }}>
                Use esta leitura para decidir se o problema está no prazo, na previsão de esforço ou no jeito como o trabalho está sendo distribuído.
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
                gap: 1.25,
              }}
            >
              {[
                { label: 'Prazo', subtitle: 'Olha atraso e entrega no prazo', icon: <IconClockCheck size={16} />, color: '#13DEB9', active: currentTab === 'sla' },
                { label: 'Estimativa', subtitle: 'Olha diferença entre previsto e real', icon: <IconScale size={16} />, color: '#5D87FF', active: currentTab === 'calibracao' },
                { label: 'Fila', subtitle: 'Reorganizar o que está travando', icon: <IconChecklist size={16} />, color: '#FFAE1F', href: '/admin/operacoes/jobs?unassigned=true' },
                { label: 'Riscos', subtitle: 'Abrir o que já pode estourar', icon: <IconAlertTriangle size={16} />, color: '#FA896B', href: '/admin/operacoes/radar' },
              ].map((item) => (
                <Box
                  key={item.label}
                  component={item.href ? 'a' : 'button'}
                  href={item.href}
                  onClick={item.href ? undefined : () => handleTabChange(item.label === 'Prazo' ? 'sla' : 'calibracao')}
                  sx={(theme) => ({
                    textAlign: 'left',
                    textDecoration: 'none',
                    color: 'inherit',
                    p: 1.5,
                    borderRadius: 2,
                    border: `1px solid ${alpha(item.color, item.active ? 0.34 : 0.2)}`,
                    bgcolor: theme.palette.mode === 'dark' ? alpha(item.color, item.active ? 0.14 : 0.07) : alpha(item.color, item.active ? 0.08 : 0.04),
                    cursor: 'pointer',
                    transition: 'all 180ms ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      borderColor: alpha(item.color, 0.36),
                    },
                  })}
                >
                  <Stack spacing={0.7}>
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: alpha(item.color, 0.14),
                        color: item.color,
                      }}
                    >
                      {item.icon}
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.primary', display: 'block', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {item.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                        {item.subtitle}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              ))}
            </Box>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip size="small" variant="outlined" label="Histórico" />
              <Chip size="small" variant="outlined" color="warning" label="Calculado pela Edro" />
              <Button variant="outlined" href="/admin/operacoes/semana?view=distribution">
                Ver semana
              </Button>
              <Button variant="outlined" href="/admin/operacoes/jobs?unassigned=true">
                Organizar fila
              </Button>
            </Stack>
          </Stack>
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
