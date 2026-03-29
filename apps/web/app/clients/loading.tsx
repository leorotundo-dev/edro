import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

export default function ClientsLoading() {
  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Skeleton variant="text" width={180} height={40} />
        <Skeleton variant="rounded" width={140} height={36} />
      </Stack>
      <Stack spacing={2}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Stack key={i} direction="row" alignItems="center" spacing={2}
            sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Skeleton variant="circular" width={44} height={44} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="40%" height={24} />
              <Skeleton variant="text" width="25%" height={18} />
            </Box>
            <Skeleton variant="rounded" width={80} height={28} />
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
