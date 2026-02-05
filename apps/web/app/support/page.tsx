'use client';

import AppShell from '@/components/AppShell';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { IconArrowRight, IconMail } from '@tabler/icons-react';

export default function SupportPage() {
  return (
    <AppShell
      title="Support"
      meta="Help Center"
      topbarLeft={
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.12em' }}>
          Support
        </Typography>
      }
    >
      <Stack spacing={3}>
        <Card>
          <CardContent>
            <Typography variant="h5" fontWeight={700}>Support Desk</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 640 }}>
              For now, use this area to log operational issues, request access, or share platform feedback.
              We can wire the real ticketing system when needed.
            </Typography>
          </CardContent>
        </Card>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="overline" color="text.disabled" sx={{ fontWeight: 600 }}>
                  Knowledge Base
                </Typography>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 1.5 }}>
                  Quick Guides
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Best practices for calendar ops, clipping triage, and AI usage inside the Studio.
                </Typography>
                <Button
                  variant="text"
                  size="small"
                  endIcon={<IconArrowRight size={16} />}
                  sx={{ mt: 2, fontWeight: 600 }}
                >
                  Open docs
                </Button>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="overline" color="text.disabled" sx={{ fontWeight: 600 }}>
                  Contact
                </Typography>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 1.5 }}>
                  Studio Operations
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Reach the internal team for platform incidents or access changes.
                </Typography>
                <Button
                  variant="text"
                  size="small"
                  endIcon={<IconMail size={16} />}
                  sx={{ mt: 2, fontWeight: 600 }}
                >
                  Send a request
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Stack>
    </AppShell>
  );
}
