'use client';

import AdminShell from '@/components/admin/AdminShell';
import Box from '@mui/material/Box';
import SystemHealthClient from './SystemHealthClient';

export default function Page() {
  return (
    <AdminShell section="sistema">
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <SystemHealthClient />
      </Box>
    </AdminShell>
  );
}
