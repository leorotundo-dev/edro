import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

export default function MeuTrabalhoLoading() {
  return (
    <Box sx={{ p: 3 }}>
      <Skeleton variant="text" width={220} height={40} sx={{ mb: 3 }} />
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 2, mb: 4 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Box key={i} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Skeleton variant="text" width="60%" height={20} sx={{ mb: 1 }} />
            <Skeleton variant="text" width={60} height={48} />
          </Box>
        ))}
      </Box>
      <Skeleton variant="text" width={160} height={28} sx={{ mb: 2 }} />
      <Stack spacing={1.5}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Stack key={i} direction="row" alignItems="center" spacing={2}
            sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Skeleton variant="circular" width={8} height={8} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="50%" height={22} />
              <Skeleton variant="text" width="35%" height={16} />
            </Box>
            <Skeleton variant="rounded" width={80} height={26} />
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
