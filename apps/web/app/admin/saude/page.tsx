'use client';

import AppShell from '@/components/AppShell';
import AdminSubmenu from '@/components/admin/AdminSubmenu';
import Box from '@mui/material/Box';
import SystemHealthClient from './SystemHealthClient';

export default function Page() {
  return (
    <AppShell title="Central de Saúde | Admin">
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <AdminSubmenu value="saude" />
        <SystemHealthClient />
      </Box>
    </AppShell>
  );
}
