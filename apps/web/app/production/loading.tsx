import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

export default function ProductionLoading() {
  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Skeleton variant="text" width={200} height={40} />
        <Stack direction="row" spacing={1}>
          <Skeleton variant="rounded" width={120} height={36} />
          <Skeleton variant="rounded" width={100} height={36} />
        </Stack>
      </Stack>
      <Stack direction="row" spacing={1} mb={3}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" width={110} height={32} />
        ))}
      </Stack>
      <Stack spacing={1.5}>
        {Array.from({ length: 7 }).map((_, i) => (
          <Stack key={i} direction="row" alignItems="center" spacing={2}
            sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Skeleton variant="rounded" width={4} height={48} sx={{ borderRadius: 1 }} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="45%" height={22} />
              <Skeleton variant="text" width="30%" height={18} />
            </Box>
            <Skeleton variant="rounded" width={90} height={28} />
            <Skeleton variant="rounded" width={32} height={32} />
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
