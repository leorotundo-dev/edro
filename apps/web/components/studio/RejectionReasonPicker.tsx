'use client';

import { useMemo, useState } from 'react';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

type Props = {
  open: boolean;
  type: 'copy' | 'pauta';
  loading?: boolean;
  onClose: () => void;
  onSubmit: (tags: string[], reason: string) => Promise<void> | void;
};

const COPY_TAGS = [
  'tom_inadequado',
  'cta_fraco',
  'sem_clareza',
  'muito_longo',
  'nao_parece_marca',
  'erro_factual',
];

const PAUTA_TAGS = [
  'fora_de_contexto',
  'sem_relevancia',
  'timing_ruim',
  'duplicada',
  'alto_risco',
  'nao_prioritario',
];

export default function RejectionReasonPicker({
  open,
  type,
  loading = false,
  onClose,
  onSubmit,
}: Props) {
  const [reason, setReason] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const tags = useMemo(() => (type === 'copy' ? COPY_TAGS : PAUTA_TAGS), [type]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    );
  };

  const handleClose = () => {
    if (loading) return;
    setReason('');
    setSelectedTags([]);
    onClose();
  };

  const handleSubmit = async () => {
    await onSubmit(selectedTags, reason.trim());
    setReason('');
    setSelectedTags([]);
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Motivo da rejeicao</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
          {type === 'copy'
            ? 'O que estava errado nesta copy?'
            : 'Por que esta pauta não deve seguir?'}
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
          {tags.map((tag) => (
            <Chip
              key={tag}
              size="small"
              clickable
              label={tag}
              color={selectedTags.includes(tag) ? 'primary' : 'default'}
              onClick={() => toggleTag(tag)}
            />
          ))}
        </Stack>
        <TextField
          fullWidth
          multiline
          minRows={3}
          label="Contexto adicional (opcional)"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar feedback'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

