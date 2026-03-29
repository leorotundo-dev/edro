import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

const SIDEBAR_WIDTH = 260;
const HEADER_HEIGHT = 64;

export default function AdminLoading() {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Sidebar skeleton */}
      <Box
        sx={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          borderRight: 1,
          borderColor: 'divider',
          p: 2,
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <Skeleton variant="rectangular" width={120} height={32} sx={{ mb: 2, borderRadius: 1 }} />
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={36} sx={{ opacity: 1 - i * 0.07 }} />
        ))}
      </Box>

      {/* Main area skeleton */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header skeleton */}
        <Box
          sx={{
            height: HEADER_HEIGHT,
            borderBottom: 1,
            borderColor: 'divider',
            px: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Skeleton variant="text" width={200} height={28} />
          <Stack direction="row" spacing={1}>
            <Skeleton variant="circular" width={32} height={32} />
            <Skeleton variant="circular" width={32} height={32} />
          </Stack>
        </Box>

        {/* Content skeleton */}
        <Box sx={{ p: 3, flex: 1 }}>
          {/* KPI strip */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={90} />
            ))}
          </Box>
          {/* Content area */}
          <Stack spacing={2}>
            <Skeleton variant="rounded" height={48} />
            <Skeleton variant="rounded" height={200} />
            <Skeleton variant="rounded" height={160} />
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
