import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

// Shown inside ClientLayoutClient (AppShell + client header already rendered by layout.tsx)
export default function ClientPageLoading() {
  return (
    <Box sx={{ pt: 1 }}>
      {/* Tab bar skeleton */}
      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" width={90} height={36} />
        ))}
      </Stack>

      {/* Content area skeleton */}
      <Stack spacing={2}>
        {/* KPI / stat row */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={80} />
          ))}
        </Box>
        {/* Main content block */}
        <Skeleton variant="rounded" height={220} />
        <Stack direction="row" spacing={2}>
          <Skeleton variant="rounded" height={140} sx={{ flex: 2 }} />
          <Skeleton variant="rounded" height={140} sx={{ flex: 1 }} />
        </Stack>
      </Stack>
    </Box>
  );
}
