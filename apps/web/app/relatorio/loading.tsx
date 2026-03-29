import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

export default function RelatorioLoading() {
  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Skeleton variant="text" width={180} height={40} />
        <Stack direction="row" spacing={1}>
          <Skeleton variant="rounded" width={140} height={36} />
          <Skeleton variant="rounded" width={100} height={36} />
        </Stack>
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 3 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Box key={i} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Skeleton variant="text" width="60%" height={18} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="40%" height={38} />
          </Box>
        ))}
      </Box>
      <Skeleton variant="rounded" height={300} />
    </Box>
  );
}
