import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

export default function LibraryLoading() {
  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Skeleton variant="text" width={160} height={40} />
        <Stack direction="row" spacing={1}>
          <Skeleton variant="rounded" width={200} height={36} />
          <Skeleton variant="rounded" width={120} height={36} />
        </Stack>
      </Stack>
      <Stack direction="row" spacing={1} mb={3}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" width={100} height={32} />
        ))}
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 2 }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <Box key={i} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Skeleton variant="rounded" height={140} sx={{ mb: 1.5 }} />
            <Skeleton variant="text" width="70%" height={24} />
            <Skeleton variant="text" width="50%" height={18} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
