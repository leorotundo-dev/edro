import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

export default function JarvisLoading() {
  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar */}
      <Box sx={{ width: 280, borderRight: '1px solid', borderColor: 'divider', p: 2 }}>
        <Skeleton variant="text" width={120} height={32} sx={{ mb: 2 }} />
        <Stack spacing={1}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={44} />
          ))}
        </Stack>
      </Box>
      {/* Main chat area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 3 }}>
        <Skeleton variant="text" width={200} height={36} sx={{ mb: 3 }} />
        <Stack spacing={2} sx={{ flex: 1 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Stack key={i} direction={i % 2 === 0 ? 'row' : 'row-reverse'} spacing={1.5} alignItems="flex-start">
              <Skeleton variant="circular" width={32} height={32} sx={{ flexShrink: 0 }} />
              <Skeleton variant="rounded" width={i % 2 === 0 ? '60%' : '45%'} height={i % 3 === 0 ? 80 : 52} />
            </Stack>
          ))}
        </Stack>
        <Skeleton variant="rounded" height={52} sx={{ mt: 2 }} />
      </Box>
    </Box>
  );
}
