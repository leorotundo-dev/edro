'use client';

import { useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { IconX, IconWand, IconDeviceFloppy, IconPlus } from '@tabler/icons-react';
import { apiGet, apiPatch } from '@/lib/api';

type Props = {
  clientId: string;
  website?: string;
  initialColors?: string[];
  onSaved?: (colors: string[]) => void;
};

export default function BrandColorsCard({ clientId, website, initialColors = [], onSaved }: Props) {
  const [colors, setColors] = useState<string[]>(initialColors);
  const [hexInput, setHexInput] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const colorPickerRef = useRef<HTMLInputElement>(null);

  const handleExtract = async () => {
    setExtracting(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiGet<{ ok: boolean; colors: string[]; website: string }>(
        `/clients/${clientId}/extract-brand-colors`
      );
      if (res?.colors?.length) {
        // Merge: mantém cores existentes e adiciona as novas extraídas
        const merged = [...colors];
        for (const c of res.colors) {
          if (!merged.includes(c)) merged.push(c);
        }
        setColors(merged.slice(0, 8));
        setSuccess(`${res.colors.length} cor(es) extraída(s) de ${res.website}. Ajuste se necessário e salve.`);
      } else {
        setError('Nenhuma cor encontrada no site. Adicione manualmente.');
      }
    } catch (e: any) {
      setError(e?.message || 'Erro ao acessar o site do cliente.');
    } finally {
      setExtracting(false);
    }
  };

  const handleAddHex = () => {
    const val = hexInput.trim().toLowerCase();
    const normalized = val.startsWith('#') ? val : `#${val}`;
    if (!/^#[0-9a-f]{3,8}$/.test(normalized)) {
      setError('Hex inválido. Ex: #ff6200');
      return;
    }
    if (!colors.includes(normalized)) {
      setColors((prev) => [...prev, normalized]);
    }
    setHexInput('');
    setError('');
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase();
    if (!colors.includes(val)) {
      setColors((prev) => [...prev, val]);
    }
  };

  const handleRemove = (color: string) => {
    setColors((prev) => prev.filter((c) => c !== color));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await apiPatch(`/clients/${clientId}/brand-colors`, { colors });
      setSuccess('Cores salvas com sucesso!');
      onSaved?.(colors);
    } catch (e: any) {
      setError(e?.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={700}>
            Cores da Marca
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              startIcon={extracting ? <CircularProgress size={14} /> : <IconWand size={14} />}
              onClick={handleExtract}
              disabled={extracting || saving}
            >
              Extrair do site
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <IconDeviceFloppy size={14} />}
              onClick={handleSave}
              disabled={saving || extracting}
            >
              Salvar
            </Button>
          </Stack>
        </Stack>

        {/* Swatches */}
        {colors.length > 0 ? (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
            {colors.map((color) => (
              <Tooltip key={color} title={color}>
                <Box
                  sx={{
                    position: 'relative',
                    width: 36,
                    height: 36,
                    borderRadius: 1,
                    background: color,
                    border: '1px solid rgba(0,0,0,0.12)',
                    cursor: 'pointer',
                    '&:hover .remove-btn': { opacity: 1 },
                  }}
                >
                  <IconButton
                    className="remove-btn"
                    size="small"
                    onClick={() => handleRemove(color)}
                    sx={{
                      opacity: 0,
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      width: 16,
                      height: 16,
                      background: 'white',
                      border: '1px solid rgba(0,0,0,0.15)',
                      transition: 'opacity 0.15s',
                      '&:hover': { background: '#fee2e2' },
                    }}
                  >
                    <IconX size={9} />
                  </IconButton>
                </Box>
              </Tooltip>
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Nenhuma cor cadastrada. Extraia do site ou adicione manualmente.
          </Typography>
        )}

        {/* Adicionar manualmente */}
        <Stack direction="row" spacing={1} alignItems="center">
          {/* Color picker nativo */}
          <Box
            component="input"
            type="color"
            ref={colorPickerRef}
            onChange={handlePickerChange}
            sx={{ width: 36, height: 36, border: '1px solid rgba(0,0,0,0.2)', borderRadius: 1, cursor: 'pointer', p: '2px' }}
          />
          <TextField
            size="small"
            placeholder="#ff6200"
            value={hexInput}
            onChange={(e) => setHexInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddHex()}
            inputProps={{ maxLength: 9 }}
            sx={{ width: 120 }}
          />
          <IconButton size="small" onClick={handleAddHex} sx={{ border: '1px solid rgba(0,0,0,0.15)' }}>
            <IconPlus size={16} />
          </IconButton>
        </Stack>

        {success && <Alert severity="success" sx={{ mt: 1.5, py: 0.5, fontSize: 12 }}>{success}</Alert>}
        {error && <Alert severity="error" sx={{ mt: 1.5, py: 0.5, fontSize: 12 }}>{error}</Alert>}
      </CardContent>
    </Card>
  );
}
