'use client';

import { useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Popover from '@mui/material/Popover';
import { alpha } from '@mui/material/styles';
import { IconCalendarDue } from '@tabler/icons-react';

type Props = {
  /** ISO date string (YYYY-MM-DD) or null */
  value?: string | null;
  /** Color used for the chip text + bg tint */
  color?: string;
  /** Called with new date (YYYY-MM-DD) or null if cleared */
  onChange: (date: string | null) => Promise<void>;
};

/**
 * InlineDateChip — shows a compact date chip that opens a native date picker
 * when clicked. Saves immediately on change. Designed for job-list rows.
 */
export default function InlineDateChip({ value, color = '#5D87FF', onChange }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayDate = value
    ? new Date(value + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    : '—';

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
    // Try to open native date picker
    setTimeout(() => {
      try { inputRef.current?.showPicker?.(); } catch { /* no-op */ }
    }, 60);
  };

  const handleClose = () => setAnchorEl(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value || null;
    setSaving(true);
    try {
      await onChange(newDate);
    } finally {
      setSaving(false);
      handleClose();
    }
  };

  return (
    <>
      <Chip
        size="small"
        icon={<IconCalendarDue size={12} />}
        label={saving ? '…' : displayDate}
        onClick={handleOpen}
        sx={{
          justifySelf: 'start',
          height: 22,
          fontSize: '0.64rem',
          fontWeight: 700,
          color,
          bgcolor: alpha(color, 0.08),
          border: 'none',
          cursor: 'pointer',
          '&:hover': { bgcolor: alpha(color, 0.16) },
          '& .MuiChip-icon': { color, marginLeft: '4px' },
        }}
      />
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        onClick={(e) => e.stopPropagation()}
        slotProps={{ paper: { sx: { mt: 0.5 } } }}
      >
        <Box sx={{ p: 1.5 }}>
          <input
            ref={inputRef}
            type="date"
            defaultValue={value ?? ''}
            onChange={handleChange}
            style={{
              fontSize: '0.875rem',
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #ccc',
              outline: 'none',
              cursor: 'pointer',
            }}
          />
        </Box>
      </Popover>
    </>
  );
}
