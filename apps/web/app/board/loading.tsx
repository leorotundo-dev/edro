import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

export default function BoardLoading() {
  return (
    <Box sx={{ p: 3, overflowX: 'auto' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Skeleton variant="text" width={160} height={40} />
        <Stack direction="row" spacing={1}>
          <Skeleton variant="rounded" width={100} height={36} />
          <Skeleton variant="rounded" width={100} height={36} />
        </Stack>
      </Stack>
      <Stack direction="row" spacing={2} sx={{ minWidth: 'max-content' }}>
        {Array.from({ length: 5 }).map((_, col) => (
          <Box key={col} sx={{ width: 280 }}>
            <Skeleton variant="rounded" height={36} sx={{ mb: 2 }} />
            <Stack spacing={1.5}>
              {Array.from({ length: 4 - (col % 2) }).map((_, card) => (
                <Skeleton key={card} variant="rounded" height={90} />
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
