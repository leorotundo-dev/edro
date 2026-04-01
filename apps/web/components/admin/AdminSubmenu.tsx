'use client';

import { type MouseEvent, type SyntheticEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { IconChevronDown } from '@tabler/icons-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Item = {
  label: string;
  value: string;
  kind: 'internal' | 'route';
  href?: string;
};

type Group = {
  label: string;
  value: string;
  children: Item[];
};

type Entry = Item | Group;

const isGroup = (e: Entry): e is Group => 'children' in e;

// ── Menu structure ─────────────────────────────────────────────────────────────

const ENTRIES: Entry[] = [
  { label: 'Visão Geral', value: 'controle', kind: 'route', href: '/admin/controle' },
  {
    label: 'Pessoas', value: 'group-pessoas',
    children: [
      { label: 'Equipe',        value: 'equipe',           kind: 'route', href: '/admin/equipe' },
      { label: 'Diretório',     value: 'pessoas',          kind: 'route', href: '/admin/pessoas' },
      { label: 'Usuários',      value: 'users',            kind: 'route', href: '/admin/users' },
      { label: 'Freelancers',   value: 'freelancers-admin', kind: 'route', href: '/admin/users?tab=freelancers' },
    ],
  },
  {
    label: 'Financeiro', value: 'group-financeiro',
    children: [
      { label: 'Pagamentos',        value: 'pagamentos',         kind: 'route', href: '/admin/pagamentos' },
      { label: 'Custos IA',         value: 'ai-costs',           kind: 'route', href: '/admin/ai-costs' },
      { label: 'Rel. Financeiro',   value: 'relatorios-fin',     kind: 'route', href: '/admin/relatorios/financeiro' },
    ],
  },
  {
    label: 'Relatórios', value: 'group-relatorios',
    children: [
      { label: 'Painel Executivo',  value: 'painel-executivo',   kind: 'route', href: '/admin/relatorios/painel' },
      { label: 'Fila de Ação',      value: 'fila-de-acao',       kind: 'route', href: '/admin/relatorios/fila' },
      { label: 'Mensais',           value: 'relatorios-mensais', kind: 'route', href: '/admin/relatorios' },
      { label: 'Briefing Ratings',  value: 'briefing-ratings',   kind: 'route', href: '/admin/analytics/briefing-ratings' },
      { label: 'Diário',            value: 'diario',             kind: 'route', href: '/admin/diario' },
    ],
  },
  {
    label: 'Sistema', value: 'group-sistema',
    children: [
      { label: 'Saúde',         value: 'saude',           kind: 'route', href: '/admin/saude' },
      { label: 'Integrações',   value: 'integracoes',     kind: 'route', href: '/admin/integrations' },
      { label: 'Automações',    value: 'automacoes',      kind: 'route', href: '/admin/automations' },
      { label: 'IA Engine',     value: 'intelligence',    kind: 'route', href: '/admin/intelligence' },
      { label: 'WhatsApp',      value: 'whatsapp-groups', kind: 'route', href: '/admin/whatsapp-groups' },
      { label: 'Reportei',      value: 'reportei',        kind: 'route', href: '/admin/reportei' },
      { label: 'Configurações', value: 'configuracoes',   kind: 'route', href: '/admin/configuracoes' },
    ],
  },
];

// Flatten all items for lookup
const ALL_ITEMS: Item[] = ENTRIES.flatMap(e => isGroup(e) ? e.children : [e]);

/** Returns the tab value to highlight given the current active item value */
function resolveTabValue(value: string): string {
  for (const entry of ENTRIES) {
    if (isGroup(entry)) {
      if (entry.children.some(c => c.value === value)) return entry.value;
    } else {
      if (entry.value === value) return value;
    }
  }
  return value;
}

// ── Component ─────────────────────────────────────────────────────────────────

type AdminSubmenuProps = {
  value: string;
  onInternalChange?: (value: string) => void;
};

export default function AdminSubmenu({ value, onInternalChange }: AdminSubmenuProps) {
  const router = useRouter();
  const tabsValue = resolveTabValue(value);

  // Menu anchor per group
  const [anchorEls, setAnchorEls] = useState<Record<string, HTMLElement | null>>({});

  const openMenu = (groupValue: string, el: HTMLElement) =>
    setAnchorEls(prev => ({ ...prev, [groupValue]: el }));
  const closeMenu = (groupValue: string) =>
    setAnchorEls(prev => ({ ...prev, [groupValue]: null }));

  const handleTabClick = (e: MouseEvent<HTMLElement>, entry: Entry) => {
    if (isGroup(entry)) {
      openMenu(entry.value, e.currentTarget);
      return;
    }
    // Direct item
    if (entry.kind === 'internal') {
      onInternalChange?.(entry.value) ?? router.push('/admin/controle');
    } else if (entry.href) {
      router.push(entry.href);
    }
  };

  const handleMenuItemClick = (item: Item, groupValue: string) => {
    closeMenu(groupValue);
    if (item.kind === 'internal') {
      if (onInternalChange) {
        onInternalChange(item.value);
      } else {
        router.push('/admin/controle');
      }
    } else if (item.href) {
      router.push(item.href);
    }
  };

  return (
    <Box sx={{ position: 'sticky', top: 12, zIndex: 20, mb: 3, bgcolor: 'background.default', borderRadius: 1 }}>
      <Tabs
        value={tabsValue}
        variant="scrollable"
        allowScrollButtonsMobile
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
        // Prevent default onChange — we handle clicks manually
        onChange={(_: SyntheticEvent) => {}}
      >
        {ENTRIES.map(entry => (
          <Tab
            key={entry.value}
            value={isGroup(entry) ? entry.value : entry.value}
            label={
              isGroup(entry) ? (
                <Box
                  component="span"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                  onClick={e => handleTabClick(e as unknown as MouseEvent<HTMLElement>, entry)}
                >
                  {entry.label}
                  <IconChevronDown size={13} style={{ marginTop: 1, opacity: 0.7 }} />
                </Box>
              ) : entry.label
            }
            onClick={isGroup(entry) ? undefined : (e) => handleTabClick(e, entry)}
          />
        ))}
      </Tabs>

      {/* Dropdown menus for groups */}
      {ENTRIES.filter(isGroup).map(group => (
        <Menu
          key={group.value}
          anchorEl={anchorEls[group.value] ?? null}
          open={Boolean(anchorEls[group.value])}
          onClose={() => closeMenu(group.value)}
          slotProps={{ paper: { sx: { mt: 0.5, minWidth: 180 } } }}
        >
          {group.children.map(item => (
            <MenuItem
              key={item.value}
              selected={item.value === value}
              onClick={() => handleMenuItemClick(item, group.value)}
              sx={{ fontSize: '0.875rem' }}
            >
              {item.label}
            </MenuItem>
          ))}
        </Menu>
      ))}
    </Box>
  );
}
