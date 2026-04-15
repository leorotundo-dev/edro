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
import Divider from '@mui/material/Divider';

type Props = {
  open: boolean;
  type: 'copy' | 'pauta';
  loading?: boolean;
  onClose: () => void;
  onSubmit: (tags: string[], reason: string, instruction: string) => Promise<void> | void;
  onRegenerate?: (tags: string[], reason: string, instruction: string) => Promise<void> | void;
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
  onRegenerate,
}: Props) {
  const [reason, setReason] = useState('');
  const [instruction, setInstruction] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const tags = useMemo(() => (type === 'copy' ? COPY_TAGS : PAUTA_TAGS), [type]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    );
  };
  const resetState = () => { setReason(''); setInstruction(''); setSelectedTags([]); };

  const handleClose = () => {
    if (loading) return;
    resetState();
    onClose();
  };

  const handleSubmit = async () => {
    await onSubmit(selectedTags, reason.trim(), instruction.trim());
    resetState();
  };

  const handleRegenerate = async () => {
    if (!onRegenerate) return;
    await onRegenerate(selectedTags, reason.trim(), instruction.trim());
    resetState();
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
        {type === 'copy' && onRegenerate ? (
          <>
            <Divider sx={{ my: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Próxima versão
              </Typography>
            </Divider>
            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Como deve ser regenerada?"
              placeholder="ex.: mais curta, CTA direto, tom mais urgente"
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
            />
          </>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ gap: 1, px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button variant="outlined" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Salvando...' : 'Só salvar feedback'}
        </Button>
        {type === 'copy' && onRegenerate ? (
          <Button
            variant="contained"
            onClick={handleRegenerate}
            disabled={loading || !instruction.trim()}
          >
            {loading ? 'Regerando...' : '↺ Regerar com instrução'}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
