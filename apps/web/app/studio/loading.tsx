import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

export default function StudioLoading() {
  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Skeleton variant="text" width={140} height={40} />
        <Skeleton variant="rounded" width={160} height={36} />
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
        <Box>
          <Skeleton variant="text" width={120} height={24} sx={{ mb: 2 }} />
          <Skeleton variant="rounded" height={220} sx={{ mb: 2 }} />
          <Stack spacing={1}>
            <Skeleton variant="rounded" height={48} />
            <Skeleton variant="rounded" height={48} />
            <Skeleton variant="rounded" height={48} />
          </Stack>
        </Box>
        <Box>
          <Skeleton variant="text" width={120} height={24} sx={{ mb: 2 }} />
          <Skeleton variant="rounded" height={360} />
        </Box>
      </Box>
    </Box>
  );
}
