'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  confirmColor?: 'error' | 'primary' | 'warning';
};

type ConfirmFn = (opts: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(async () => false);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions>({ message: '' });
  const resolverRef = useRef<(v: boolean) => void>(null);

  const confirm = useCallback((input: ConfirmOptions | string): Promise<boolean> => {
    const normalized = typeof input === 'string' ? { message: input } : input;
    setOpts(normalized);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleConfirm = () => { setOpen(false); resolverRef.current?.(true); };
  const handleCancel = () => { setOpen(false); resolverRef.current?.(false); };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={open} onClose={handleCancel} maxWidth="xs" fullWidth>
        {opts.title && <DialogTitle sx={{ pb: 1 }}>{opts.title}</DialogTitle>}
        <DialogContent sx={{ pt: opts.title ? 0 : 2.5 }}>
          <Typography variant="body2" color="text.secondary">{opts.message}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={handleCancel} variant="outlined" size="small">
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            color={opts.confirmColor ?? 'error'}
            size="small"
          >
            {opts.confirmLabel ?? 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  return useContext(ConfirmContext);
}
