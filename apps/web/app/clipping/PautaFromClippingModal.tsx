'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBriefingDrawer } from '@/contexts/BriefingDrawerContext';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { IconX } from '@tabler/icons-react';
import { apiPost } from '@/lib/api';
import PautaComparisonCard, { type PautaSuggestion } from '@/app/edro/PautaComparisonCard';

type Props = {
  open: boolean;
  suggestion: PautaSuggestion | null;
  onClose: () => void;
};

export default function PautaFromClippingModal({ open, suggestion, onClose }: Props) {
  const router = useRouter();
  const { open: openBriefing } = useBriefingDrawer();
  const [loading, setLoading] = useState(false);

  async function handleApprove(approach: 'A' | 'B') {
    if (!suggestion) return;
    setLoading(true);
    try {
      const res = await apiPost<{ ok: boolean; briefing_id: string }>(
        `/pauta-inbox/${suggestion.id}/approve`,
        { approach }
      );
      if (res?.briefing_id) {
        onClose();
        openBriefing(res.briefing_id);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    if (!suggestion) return;
    setLoading(true);
    try {
      await apiPost(`/pauta-inbox/${suggestion.id}/reject`, {});
    } finally {
      setLoading(false);
      onClose();
    }
  }

  if (!suggestion) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Typography variant="h6" fontWeight={700}>
          Abordagens para a Pauta
        </Typography>
        <IconButton size="small" onClick={onClose} disabled={loading}>
          <IconX size={18} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        <PautaComparisonCard
          suggestion={suggestion}
          loading={loading}
          onApproveA={() => handleApprove('A')}
          onApproveB={() => handleApprove('B')}
          onReject={handleReject}
        />
      </DialogContent>
    </Dialog>
  );
}
