import PautaInboxPanel from '../PautaInboxPanel';
import AppShell from '@/components/AppShell';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export default function EdroInboxPage() {
  return (
    <AppShell
      title="Pauta Inbox"
      topbarLeft={
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="caption" color="text.secondary">
            Edro
          </Typography>
          <Typography variant="caption" color="text.secondary">
            / Pauta Inbox
          </Typography>
        </Stack>
      }
    >
      <PautaInboxPanel />
    </AppShell>
  );
}
