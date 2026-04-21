import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ReportViewerClient from '@/app/(portal)/relatorios/[month]/ReportViewerClient';
import type { MonthlyReport } from '@/types/monthly-report';

async function getReportByToken(token: string): Promise<MonthlyReport | null> {
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.API_URL ??
    'http://localhost:3001';
  try {
    const res = await fetch(`${apiUrl}/api/r/${token}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json() as Promise<MonthlyReport>;
  } catch {
    return null;
  }
}

export default async function PublicReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const report = await getReportByToken(token);

  if (!report) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.paper',
          px: 3,
          gap: 1,
        }}
      >
        <Typography variant="h4" fontWeight={700} color="text.secondary">
          Relatório não encontrado
        </Typography>
        <Typography variant="body1" color="text.disabled">
          O link pode ter expirado ou o relatório não está disponível.
        </Typography>
      </Box>
    );
  }

  return <ReportViewerClient mode="public" report={report} />;
}
