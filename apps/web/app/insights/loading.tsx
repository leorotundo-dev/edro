import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

export default function InsightsLoading() {
  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Skeleton variant="text" width={160} height={40} />
        <Skeleton variant="rounded" width={180} height={36} />
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 3 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Box key={i} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Skeleton variant="text" width="60%" height={20} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="40%" height={36} />
          </Box>
        ))}
      </Box>
      <Stack spacing={2}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Box key={i} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Skeleton variant="rounded" width={4} height={60} sx={{ flexShrink: 0, borderRadius: 1 }} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="50%" height={22} />
                <Skeleton variant="text" width="80%" height={18} />
                <Skeleton variant="text" width="35%" height={16} />
              </Box>
            </Stack>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
