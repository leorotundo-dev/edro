import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

export default function ClippingLoading() {
  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Skeleton variant="text" width={160} height={40} />
        <Stack direction="row" spacing={1}>
          <Skeleton variant="rounded" width={140} height={36} />
          <Skeleton variant="rounded" width={100} height={36} />
        </Stack>
      </Stack>
      <Stack spacing={2}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Box key={i} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
              <Skeleton variant="text" width="55%" height={24} />
              <Skeleton variant="rounded" width={70} height={22} />
            </Stack>
            <Skeleton variant="text" width="80%" height={18} />
            <Skeleton variant="text" width="40%" height={18} />
            <Stack direction="row" spacing={1} mt={1}>
              <Skeleton variant="rounded" width={60} height={22} />
              <Skeleton variant="rounded" width={80} height={22} />
            </Stack>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
