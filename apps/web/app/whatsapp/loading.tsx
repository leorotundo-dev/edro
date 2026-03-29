import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

export default function WhatsappLoading() {
  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Lista de conversas */}
      <Box sx={{ width: 340, borderRight: '1px solid', borderColor: 'divider', p: 2 }}>
        <Skeleton variant="rounded" height={40} sx={{ mb: 2 }} />
        <Stack spacing={1}>
          {Array.from({ length: 10 }).map((_, i) => (
            <Stack key={i} direction="row" spacing={1.5} alignItems="center" sx={{ p: 1 }}>
              <Skeleton variant="circular" width={44} height={44} sx={{ flexShrink: 0 }} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="60%" height={20} />
                <Skeleton variant="text" width="80%" height={16} />
              </Box>
              <Skeleton variant="text" width={30} height={14} />
            </Stack>
          ))}
        </Stack>
      </Box>
      {/* Área de mensagens */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Skeleton variant="circular" width={40} height={40} />
          <Box>
            <Skeleton variant="text" width={140} height={22} />
            <Skeleton variant="text" width={80} height={16} />
          </Box>
        </Stack>
        <Box sx={{ flex: 1, py: 2 }}>
          <Stack spacing={2}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Stack key={i} direction={i % 3 === 0 ? 'row-reverse' : 'row'} spacing={1}>
                <Skeleton variant="rounded" width={i % 2 === 0 ? '45%' : '60%'} height={i % 4 === 0 ? 70 : 44} />
              </Stack>
            ))}
          </Stack>
        </Box>
        <Skeleton variant="rounded" height={48} />
      </Box>
    </Box>
  );
}
