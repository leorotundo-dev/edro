'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

export default function ClientError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h5" color="error" gutterBottom>
        Erro ao carregar página do cliente
      </Typography>
      <Typography variant="body2" sx={{ mb: 2, fontFamily: 'monospace', bgcolor: '#f5f5f5', p: 2, borderRadius: 1, textAlign: 'left', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {error.message}
        {'\n\n'}
        {error.stack}
      </Typography>
      <Button variant="contained" onClick={reset}>
        Tentar novamente
      </Button>
    </Box>
  );
}
