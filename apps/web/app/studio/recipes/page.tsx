'use client';
import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import { IconChefHat, IconTrash, IconArrowRight, IconClock } from '@tabler/icons-react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import type { CreativeRecipe } from '@/components/pipeline/PipelineContext';

const TRIGGER_COLORS: Record<string, string> = {
  G01: '#FF4D4D', G02: '#00B4FF', G03: '#13DEB9',
  G04: '#F5C518', G05: '#A855F7', G06: '#FB923C', G07: '#888',
};
const TRIGGER_NAMES: Record<string, string> = {
  G01: 'Escassez', G02: 'Autoridade', G03: 'Prova Social',
  G04: 'Reciprocidade', G05: 'Curiosidade', G06: 'Identidade', G07: 'Dor/Solução',
};

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<CreativeRecipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ success: boolean; data: CreativeRecipe[] }>('/studio/recipes?limit=50')
      .then((res) => setRecipes(res?.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  const deleteRecipe = async (id: string) => {
    await apiPost(`/studio/recipes/${id}`, {}).catch(() => {});
    setRecipes((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <Box sx={{ p: 3, maxWidth: 960, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
        <Box sx={{
          width: 40, height: 40, borderRadius: 2,
          bgcolor: 'rgba(248,168,0,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <IconChefHat size={20} color="#F8A800" />
        </Box>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Livro de Receitas</Typography>
          <Typography variant="body2" color="text.secondary">
            Fluxos criativos que funcionaram — reutilize com um clique
          </Typography>
        </Box>
        <Box sx={{ ml: 'auto' }}>
          <Button
            variant="outlined" size="small"
            component={Link} href="/studio"
            endIcon={<IconArrowRight size={14} />}
            sx={{ textTransform: 'none' }}
          >
            Novo Pipeline
          </Button>
        </Box>
      </Stack>

      {loading ? (
        <Stack alignItems="center" py={6}>
          <CircularProgress size={24} />
        </Stack>
      ) : recipes.length === 0 ? (
        <Box sx={{
          border: '1px dashed #2a2a2a', borderRadius: 3, p: 5,
          textAlign: 'center',
        }}>
          <IconChefHat size={32} color="#333" style={{ marginBottom: 12 }} />
          <Typography color="text.disabled" sx={{ fontSize: '0.85rem' }}>
            Nenhuma receita salva ainda
          </Typography>
          <Typography color="text.disabled" sx={{ fontSize: '0.75rem', mt: 0.5 }}>
            Complete um pipeline e clique em "Guardar no Livro de Receitas"
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {recipes.map((recipe) => (
            <Grid key={recipe.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{
                bgcolor: '#111', border: '1px solid #1e1e1e', borderRadius: 2.5,
                p: 2, height: '100%', display: 'flex', flexDirection: 'column',
                transition: 'border-color 0.2s',
                '&:hover': { borderColor: '#F8A80055' },
              }}>
                {/* Name + delete */}
                <Stack direction="row" alignItems="flex-start" mb={1.25}>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary', lineHeight: 1.3 }}>
                      {recipe.name}
                    </Typography>
                    {recipe.objective && (
                      <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled', mt: 0.25 }}>
                        {recipe.objective}
                      </Typography>
                    )}
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => deleteRecipe(recipe.id)}
                    sx={{ p: 0.5, color: '#444', '&:hover': { color: '#FF4D4D' } }}
                  >
                    <IconTrash size={14} />
                  </IconButton>
                </Stack>

                {/* Tags */}
                <Stack direction="row" spacing={0.5} flexWrap="wrap" mb={1.25} sx={{ flex: 1 }}>
                  {recipe.platform && (
                    <Chip size="small" label={recipe.platform}
                      sx={{ height: 20, fontSize: '0.6rem', bgcolor: 'rgba(19,222,185,0.1)', color: '#13DEB9' }} />
                  )}
                  {recipe.format && (
                    <Chip size="small" label={recipe.format}
                      sx={{ height: 20, fontSize: '0.6rem', bgcolor: 'rgba(19,222,185,0.06)', color: '#13DEB966' }} />
                  )}
                  {recipe.trigger_id && (
                    <Chip size="small"
                      label={`${recipe.trigger_id} ${TRIGGER_NAMES[recipe.trigger_id] || ''}`}
                      sx={{
                        height: 20, fontSize: '0.6rem',
                        bgcolor: `${TRIGGER_COLORS[recipe.trigger_id] || '#888'}18`,
                        color: TRIGGER_COLORS[recipe.trigger_id] || '#888',
                      }}
                    />
                  )}
                  <Chip size="small" label={recipe.pipeline_type}
                    sx={{ height: 20, fontSize: '0.6rem', bgcolor: '#1e1e1e', color: '#555' }} />
                </Stack>

                {/* Footer */}
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <IconClock size={11} color="#444" />
                    <Typography sx={{ fontSize: '0.58rem', color: '#444' }}>
                      {recipe.use_count > 0 ? `Usada ${recipe.use_count}×` : 'Nunca usada'}
                    </Typography>
                  </Stack>
                  <Button
                    size="small" variant="text"
                    component={Link}
                    href="/studio"
                    endIcon={<IconArrowRight size={12} />}
                    sx={{ textTransform: 'none', fontSize: '0.65rem', color: '#F8A800', p: 0,
                      '&:hover': { bgcolor: 'transparent', color: '#ffc234' } }}
                  >
                    Cozinhar
                  </Button>
                </Stack>
              </Box>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
