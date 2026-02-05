'use client';

import Chip from '@mui/material/Chip';

const STATUS_MAP: Record<string, { color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'default'; label?: string }> = {
  briefing: { color: 'info', label: 'Briefing' },
  iclips_in: { color: 'secondary', label: 'iClips Entrada' },
  alinhamento: { color: 'warning', label: 'Alinhamento' },
  copy_ia: { color: 'secondary', label: 'Copy IA' },
  aprovacao: { color: 'warning', label: 'Aprovação' },
  producao: { color: 'error', label: 'Produção' },
  revisao: { color: 'primary', label: 'Revisão' },
  iclips_out: { color: 'secondary', label: 'iClips' },
  entrega: { color: 'success', label: 'Entrega' },
  done: { color: 'success', label: 'Concluído' },
  concluido: { color: 'success', label: 'Concluído' },
  pending: { color: 'warning', label: 'Pendente' },
  active: { color: 'success', label: 'Ativo' },
  inactive: { color: 'default', label: 'Inativo' },
  draft: { color: 'default', label: 'Rascunho' },
  high: { color: 'error', label: 'Alta' },
  medium: { color: 'warning', label: 'Média' },
  low: { color: 'success', label: 'Baixa' },
};

type StatusChipProps = {
  status: string;
  label?: string;
  size?: 'small' | 'medium';
};

export default function StatusChip({ status, label, size = 'small' }: StatusChipProps) {
  const mapped = STATUS_MAP[status.toLowerCase()] || { color: 'default' as const };

  return (
    <Chip
      label={label || mapped.label || status}
      color={mapped.color}
      size={size}
      variant="filled"
    />
  );
}
