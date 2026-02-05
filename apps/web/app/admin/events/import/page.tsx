'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiPost } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  IconArrowLeft,
  IconConfetti,
  IconUpload,
  IconFileUpload,
  IconDownload,
  IconCheck,
  IconX,
  IconCalendarEvent,
} from '@tabler/icons-react';

type ImportResult = {
  success: boolean;
  imported: number;
  failed: number;
  errors?: string[];
  events?: any[];
};

export default function EventImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importType, setImportType] = useState<'csv' | 'holidays'>('holidays');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  // CSV Import
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<string>('');

  // Holidays Import
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setResult(null);

    // Read file preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').slice(0, 6);
      setCsvPreview(lines.join('\n'));
    };
    reader.readAsText(file);
  };

  const handleCsvImport = async () => {
    if (!csvFile) return;

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', csvFile);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'}/events/import/csv`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: formData,
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        setCsvFile(null);
        setCsvPreview('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error: any) {
      setResult({
        success: false,
        imported: 0,
        failed: 0,
        errors: [error.message || 'Failed to import CSV'],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleHolidaysImport = async () => {
    setLoading(true);
    setResult(null);

    try {
      const res = await apiPost<ImportResult>('/events/import/holidays', {
        year: selectedYear,
      });
      setResult(res || null);
    } catch (error: any) {
      setResult({
        success: false,
        imported: 0,
        failed: 0,
        errors: [error.message || 'Failed to import holidays'],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Event Import">
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Button
            size="small"
            onClick={() => router.push('/calendar')}
            startIcon={<IconArrowLeft size={16} />}
            sx={{ mb: 1 }}
          >
            Voltar para Calendario
          </Button>
          <Typography variant="h4" gutterBottom>Import Calendar Events</Typography>
          <Typography variant="body2" color="text.secondary">
            Importe eventos em massa via CSV ou API de feriados
          </Typography>
        </Box>

        {/* Import Type Selector */}
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>Select Import Type</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card
                  variant="outlined"
                  onClick={() => {
                    setImportType('holidays');
                    setResult(null);
                  }}
                  sx={{
                    cursor: 'pointer',
                    p: 3,
                    borderWidth: 2,
                    borderColor: importType === 'holidays' ? 'primary.main' : 'divider',
                    bgcolor: importType === 'holidays' ? 'primary.50' : 'transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <IconConfetti size={40} color={importType === 'holidays' ? '#1976d2' : undefined} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2">Brazilian Holidays</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Import official Brazilian holidays from BrasilAPI
                      </Typography>
                    </Box>
                  </Stack>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Card
                  variant="outlined"
                  onClick={() => {
                    setImportType('csv');
                    setResult(null);
                  }}
                  sx={{
                    cursor: 'pointer',
                    p: 3,
                    borderWidth: 2,
                    borderColor: importType === 'csv' ? 'primary.main' : 'divider',
                    bgcolor: importType === 'csv' ? 'primary.50' : 'transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <IconFileUpload size={40} color={importType === 'csv' ? '#9c27b0' : undefined} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2">CSV Upload</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Upload custom events from a CSV file
                      </Typography>
                    </Box>
                  </Stack>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* CSV Import Section */}
        {importType === 'csv' && (
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>CSV File Upload</Typography>

              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>CSV Format Requirements:</Typography>
                <Stack spacing={0.5}>
                  <Typography variant="body2">
                    Required columns: <code>date</code>, <code>name</code>
                  </Typography>
                  <Typography variant="body2">
                    Optional columns: <code>slug</code>, <code>categories</code>, <code>base_relevance</code>
                  </Typography>
                  <Typography variant="body2">Date format: YYYY-MM-DD</Typography>
                  <Typography variant="body2">Categories: comma-separated (e.g., &quot;dia-das-maes,comercial&quot;)</Typography>
                  <Typography variant="body2">Base relevance: number 0-100</Typography>
                </Stack>
              </Alert>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Select CSV File
                </Typography>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  aria-label="Select CSV file"
                />
              </Box>

              {csvPreview && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Preview (first 5 lines)
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      p: 2,
                      bgcolor: 'action.hover',
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      fontSize: '0.75rem',
                      overflow: 'auto',
                    }}
                  >
                    {csvPreview}
                  </Box>
                </Box>
              )}

              <Button
                fullWidth
                variant="contained"
                color="secondary"
                onClick={handleCsvImport}
                disabled={!csvFile || loading}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <IconUpload size={18} />}
              >
                {loading ? 'Importing...' : 'Import CSV'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Holidays Import Section */}
        {importType === 'holidays' && (
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>Import Brazilian Holidays</Typography>

              <Alert severity="info" sx={{ mb: 3 }}>
                This will import all official Brazilian national holidays for the selected year from the BrasilAPI.
                Existing events for the same dates will be skipped.
              </Alert>

              <Box sx={{ mb: 3 }}>
                <TextField
                  select
                  label="Select Year"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  sx={{ width: { xs: '100%', md: 260 } }}
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i).map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              <Button
                fullWidth
                variant="contained"
                onClick={handleHolidaysImport}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <IconDownload size={18} />}
              >
                {loading ? 'Importing...' : `Import ${selectedYear} Holidays`}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && (
          <Alert
            severity={result.success ? 'success' : 'error'}
            icon={result.success ? <IconCheck size={24} /> : <IconX size={24} />}
            sx={{ mb: 3 }}
          >
            <Typography variant="subtitle1" gutterBottom>
              {result.success ? 'Import Successful!' : 'Import Failed'}
            </Typography>
            <Stack spacing={0.5}>
              <Typography variant="body2">Successfully imported: {result.imported} events</Typography>
              {result.failed > 0 && (
                <Typography variant="body2">Failed: {result.failed} events</Typography>
              )}
            </Stack>

            {result.errors && result.errors.length > 0 && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'error.light' }}>
                <Typography variant="body2" fontWeight={600} gutterBottom>Errors:</Typography>
                <ul>
                  {result.errors.map((error, idx) => (
                    <li key={idx}>
                      <Typography variant="body2">{error}</Typography>
                    </li>
                  ))}
                </ul>
              </Box>
            )}

            {result.success && result.events && result.events.length > 0 && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'success.light', maxHeight: 256, overflow: 'auto' }}>
                <Typography variant="body2" fontWeight={600} gutterBottom>Imported Events:</Typography>
                <Stack spacing={1}>
                  {result.events.map((event: any, idx: number) => (
                    <Stack key={idx} direction="row" spacing={1} alignItems="center">
                      <IconCalendarEvent size={14} />
                      <Typography variant="body2" fontWeight={600}>
                        {event.date || event.event_date}
                      </Typography>
                      <Typography variant="body2">{event.name}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}

            {result.success && (
              <Button
                variant="contained"
                color="success"
                onClick={() => router.push('/calendar')}
                sx={{ mt: 2 }}
              >
                Go to Calendar
              </Button>
            )}
          </Alert>
        )}
      </Box>
    </AppShell>
  );
}
