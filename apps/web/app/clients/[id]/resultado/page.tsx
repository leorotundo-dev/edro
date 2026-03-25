'use client';

import { useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ClientPerformanceClient from '../performance/ClientPerformanceClient';
import ReporteiMetricsClient from '../metricas/ReporteiMetricsClient';
import OperacionalPage from '../metricas/OperacionalPage';
import ValorPage from '../metricas/ValorPage';
import MarcaPage from '../metricas/MarcaPage';
import EstrategiaPage from '../metricas/EstrategiaPage';
import ClientReportsPage from '../reports/page';

function SectionAnchor({ id, label }: { id: string; label: string }) {
  return (
    <Box id={id} sx={{ scrollMarginTop: 80 }}>
      <Typography variant="overline" color="text.secondary" fontWeight={700} letterSpacing={1.5}>
        {label}
      </Typography>
    </Box>
  );
}

export default function ResultadoPage() {
  const params = useParams();
  const clientId = params.id as string;

  return (
    <Stack spacing={0} divider={<Divider sx={{ my: 5 }} />}>
      <Box>
        <SectionAnchor id="performance" label="Performance" />
        <Box sx={{ mt: 2 }}>
          <ClientPerformanceClient clientId={clientId} />
        </Box>
      </Box>

      <Box>
        <SectionAnchor id="reportei" label="Métricas Reportei" />
        <Box sx={{ mt: 2 }}>
          <ReporteiMetricsClient clientId={clientId} />
        </Box>
      </Box>

      <Box>
        <SectionAnchor id="operacional" label="Saúde Operacional" />
        <Box sx={{ mt: 2 }}>
          <OperacionalPage clientId={clientId} />
        </Box>
      </Box>

      <Box>
        <SectionAnchor id="valor" label="Valor & ROI" />
        <Box sx={{ mt: 2 }}>
          <ValorPage clientId={clientId} />
        </Box>
      </Box>

      <Box>
        <SectionAnchor id="marca" label="Marca & Conteúdo" />
        <Box sx={{ mt: 2 }}>
          <MarcaPage clientId={clientId} />
        </Box>
      </Box>

      <Box>
        <SectionAnchor id="estrategia" label="Estratégia" />
        <Box sx={{ mt: 2 }}>
          <EstrategiaPage clientId={clientId} />
        </Box>
      </Box>

      <Box>
        <SectionAnchor id="relatorios" label="Relatórios" />
        <Box sx={{ mt: 2 }}>
          <ClientReportsPage />
        </Box>
      </Box>
    </Stack>
  );
}
