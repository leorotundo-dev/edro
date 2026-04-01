'use client';

import { type ReactElement, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import {
  IconShieldCheck,
  IconUsersGroup,
  IconCurrencyDollar,
  IconReportAnalytics,
  IconServer,
} from '@tabler/icons-react';

export type AdminSection =
  | 'controle'
  | 'equipe'
  | 'financeiro'
  | 'relatorios'
  | 'sistema';

const SECTIONS: Array<{ key: AdminSection; label: string; href: string; icon: ReactElement }> = [
  { key: 'controle',   label: 'Visão Geral',  href: '/admin/controle',             icon: <IconShieldCheck size={16} /> },
  { key: 'equipe',     label: 'Pessoas',      href: '/admin/equipe',               icon: <IconUsersGroup size={16} /> },
  { key: 'financeiro', label: 'Financeiro',   href: '/admin/pagamentos',           icon: <IconCurrencyDollar size={16} /> },
  { key: 'relatorios', label: 'Relatórios',   href: '/admin/relatorios/painel',    icon: <IconReportAnalytics size={16} /> },
  { key: 'sistema',    label: 'Sistema',      href: '/admin/saude',                icon: <IconServer size={16} /> },
];

const SECTION_COPY: Record<AdminSection, { title: string; subtitle: string }> = {
  controle:   { title: 'Admin',       subtitle: 'Integrações, dados e saúde do sistema.' },
  equipe:     { title: 'Pessoas',     subtitle: 'Equipe, diretório e usuários.' },
  financeiro: { title: 'Financeiro',  subtitle: 'Pagamentos, custos e relatório financeiro.' },
  relatorios: { title: 'Relatórios',  subtitle: 'Painel executivo, fila de ação e mensais.' },
  sistema:    { title: 'Sistema',     subtitle: 'Saúde, integrações, automações e configurações.' },
};

export default function AdminShell({
  section,
  children,
  summary,
}: {
  section: AdminSection;
  children: ReactNode;
  summary?: ReactNode;
}) {
  const router = useRouter();
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const copy = SECTION_COPY[section];

  return (
    <AppShell title={copy.title} meta={copy.subtitle}>
      {/* Admin navigation bar — same pill pattern as OperationsShell */}
      <Box
        sx={{
          mx: { xs: -2, sm: -3 },
          mt: { xs: -2, sm: -3 },
          mb: 3,
          px: { xs: 2, sm: 3 },
          pt: 1.5,
          pb: summary ? 0 : 1.5,
          bgcolor: 'background.paper',
          borderBottom: `1px solid ${alpha(theme.palette.divider, dark ? 0.15 : 0.12)}`,
        }}
      >
        <Stack spacing={1.25}>
          <Stack
            direction="row"
            spacing={0.5}
            sx={{
              overflowX: 'auto',
              py: 0.25,
              px: 0.5,
              borderRadius: 2,
              bgcolor: dark
                ? alpha(theme.palette.common.white, 0.04)
                : alpha(theme.palette.common.black, 0.04),
              '&::-webkit-scrollbar': { display: 'none' },
            }}
          >
            {SECTIONS.map((item) => {
              const isActive = item.key === section;
              return (
                <Box
                  key={item.key}
                  onClick={() => router.push(item.href)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.6,
                    px: 1.75,
                    py: 0.7,
                    borderRadius: 1.5,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    fontSize: '0.78rem',
                    fontWeight: isActive ? 800 : 600,
                    color: isActive
                      ? '#fff'
                      : dark
                        ? alpha(theme.palette.text.primary, 0.6)
                        : alpha(theme.palette.text.primary, 0.55),
                    bgcolor: isActive ? 'primary.main' : 'transparent',
                    transition: 'all 200ms cubic-bezier(0.4,0,0.2,1)',
                    '&:hover': isActive
                      ? {}
                      : {
                          bgcolor: dark
                            ? alpha(theme.palette.common.white, 0.06)
                            : alpha(theme.palette.common.black, 0.05),
                          color: theme.palette.text.primary,
                        },
                    '& svg': { opacity: isActive ? 1 : 0.6, transition: 'opacity 200ms ease' },
                  }}
                >
                  {item.icon}
                  {item.label}
                </Box>
              );
            })}
          </Stack>

          {summary ? (
            <Box
              sx={{
                pt: 1,
                pb: 1.25,
                borderTop: `1px solid ${alpha(theme.palette.divider, dark ? 0.1 : 0.08)}`,
              }}
            >
              {summary}
            </Box>
          ) : null}
        </Stack>
      </Box>

      <Box>{children}</Box>
    </AppShell>
  );
}
