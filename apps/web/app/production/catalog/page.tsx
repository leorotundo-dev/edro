'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { apiGet } from '@/lib/api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { IconRefresh } from '@tabler/icons-react';

const PRODUCT_IMAGES = [
  '/modernize/images/products/s1.jpg',
  '/modernize/images/products/s2.jpg',
  '/modernize/images/products/s3.jpg',
  '/modernize/images/products/s4.jpg',
  '/modernize/images/products/s5.jpg',
  '/modernize/images/products/s6.jpg',
  '/modernize/images/products/s7.jpg',
  '/modernize/images/products/s8.jpg',
  '/modernize/images/products/s9.jpg',
  '/modernize/images/products/s10.jpg',
  '/modernize/images/products/s11.jpg',
  '/modernize/images/products/s12.jpg',
];

type ProductionFormat = {
  id: string;
  name: string;
  type: string;
  category: string;
  description?: string;
  dimensions?: {
    width?: number;
    height?: number;
    duration?: number;
  };
  specs?: {
    file_format?: string[];
    aspect_ratio?: string;
    max_size_mb?: number;
  };
  platforms?: string[];
  metrics?: {
    avg_engagement?: number;
    avg_reach?: number;
    avg_clicks?: number;
    total_uses?: number;
  };
  ml_insights?: {
    predicted_performance?: number;
    trending?: boolean;
    recommendation_score?: number;
  };
  tags?: string[];
  created_at?: string;
  updated_at?: string;
};

type CatalogStats = {
  total_formats: number;
  by_type: Record<string, number>;
  by_category: Record<string, number>;
  by_platform: Record<string, number>;
  most_used: ProductionFormat[];
  trending: ProductionFormat[];
};

export default function ProductionCatalogPage() {
  const [loading, setLoading] = useState(true);
  const [formats, setFormats] = useState<ProductionFormat[]>([]);
  const [stats, setStats] = useState<CatalogStats | null>(null);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ success: boolean; catalog: ProductionFormat[]; stats: CatalogStats }>(
        '/production/catalog'
      );
      if (res?.catalog) {
        setFormats(res.catalog);
      }
      if (res?.stats) {
        setStats(res.stats);
      }
    } catch (error) {
      console.error('Failed to load catalog:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFormats = formats.filter((format) => {
    const matchesType = selectedType === 'all' || format.type === selectedType;
    const matchesCategory = selectedCategory === 'all' || format.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      format.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      format.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesCategory && matchesSearch;
  });

  const types = stats ? Object.keys(stats.by_type) : [];
  const categories = stats ? Object.keys(stats.by_category) : [];

  if (loading) {
    return (
      <Box sx={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Carregando catálogo...
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <AppShell title="Production Catalog">
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4">Production Catalog</Typography>
          <Typography variant="body2" color="text.secondary">
            Base de formatos com inteligência de performance e tendências.
          </Typography>
        </Box>

        <Grid container spacing={2} alignItems="flex-start">
          <Grid size={{ xs: 12, lg: 3 }}>
            <Stack spacing={2}>
              <Card variant="outlined">
                <CardContent>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        Filtros
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Refine por tipo, categoria e busca.
                      </Typography>
                    </Box>
                    <TextField
                      label="Buscar"
                      placeholder="Buscar formatos..."
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      size="small"
                      fullWidth
                    />
                    <TextField
                      select
                      label="Tipo"
                      value={selectedType}
                      onChange={(event) => setSelectedType(event.target.value)}
                      size="small"
                      fullWidth
                    >
                      <MenuItem value="all">Todos os tipos</MenuItem>
                      {types.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type} ({stats?.by_type[type]})
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      select
                      label="Categoria"
                      value={selectedCategory}
                      onChange={(event) => setSelectedCategory(event.target.value)}
                      size="small"
                      fullWidth
                    >
                      <MenuItem value="all">Todas as categorias</MenuItem>
                      {categories.map((category) => (
                        <MenuItem key={category} value={category}>
                          {category} ({stats?.by_category[category]})
                        </MenuItem>
                      ))}
                    </TextField>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Visualização
                      </Typography>
                      <ToggleButtonGroup
                        value={viewMode}
                        exclusive
                        size="small"
                        onChange={(_, value) => {
                          if (value) setViewMode(value);
                        }}
                        sx={{ mt: 1 }}
                      >
                        <ToggleButton value="grid">Grade</ToggleButton>
                        <ToggleButton value="list">Lista</ToggleButton>
                      </ToggleButtonGroup>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>

              {stats && (
                <Card variant="outlined">
                  <CardContent>
                    <Stack spacing={1}>
                      <Typography variant="subtitle2">Resumo rápido</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Volume atual do catálogo.
                      </Typography>
                    </Stack>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">Total</Typography>
                        <Typography variant="h6">{stats.total_formats}</Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">Tipos</Typography>
                        <Typography variant="h6">{Object.keys(stats.by_type).length}</Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">Categorias</Typography>
                        <Typography variant="h6">{Object.keys(stats.by_category).length}</Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">Plataformas</Typography>
                        <Typography variant="h6">{Object.keys(stats.by_platform).length}</Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              )}
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, lg: 9 }}>
            <Stack spacing={2}>
              {stats && (
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="caption" color="text.secondary">Total de formatos</Typography>
                        <Typography variant="h5">{stats.total_formats}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="caption" color="text.secondary">Tipos ativos</Typography>
                        <Typography variant="h5">{Object.keys(stats.by_type).length}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="caption" color="text.secondary">Categorias</Typography>
                        <Typography variant="h5">{Object.keys(stats.by_category).length}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="caption" color="text.secondary">Plataformas</Typography>
                        <Typography variant="h5">{Object.keys(stats.by_platform).length}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}

              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  Mostrando {filteredFormats.length} de {formats.length} formatos
                </Typography>
                <Button variant="outlined" startIcon={<IconRefresh size={16} />} onClick={loadCatalog}>
                  Atualizar
                </Button>
              </Stack>

              {viewMode === 'grid' ? (
                <Grid container spacing={2}>
                  {filteredFormats.map((format, index) => {
                    const image = PRODUCT_IMAGES[index % PRODUCT_IMAGES.length];
                    return (
                      <Grid size={{ xs: 12, md: 6, lg: 4 }} key={format.id}>
                        <Card variant="outlined" sx={{ height: '100%' }}>
                          <Box
                            sx={{
                              height: 180,
                              backgroundImage: `url(${image})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              borderTopLeftRadius: 16,
                              borderTopRightRadius: 16,
                            }}
                          />
                          <CardContent>
                            <Stack spacing={1.5}>
                              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                                <Typography variant="subtitle1" fontWeight={600}>
                                  {format.name}
                                </Typography>
                                {format.ml_insights?.trending && (
                                  <Chip size="small" color="primary" label="Em alta" />
                                )}
                              </Stack>
                              <Stack direction="row" spacing={1} flexWrap="wrap">
                                <Chip size="small" variant="outlined" label={format.type} />
                                <Chip size="small" variant="outlined" label={format.category} />
                              </Stack>
                              {format.description && (
                                <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                  {format.description}
                                </Typography>
                              )}
                              {format.platforms && format.platforms.length > 0 && (
                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                  {format.platforms.slice(0, 3).map((platform) => (
                                    <Chip key={platform} size="small" label={platform} />
                                  ))}
                                  {format.platforms.length > 3 && (
                                    <Typography variant="caption" color="text.secondary">
                                      +{format.platforms.length - 3}
                                    </Typography>
                                  )}
                                </Stack>
                              )}
                              <Divider />
                              <Stack direction="row" justifyContent="space-between">
                                <Box>
                                  <Typography variant="caption" color="text.secondary">Usos</Typography>
                                  <Typography variant="subtitle2">{format.metrics?.total_uses || 0}</Typography>
                                </Box>
                                <Box textAlign="right">
                                  <Typography variant="caption" color="text.secondary">Score</Typography>
                                  <Typography variant="subtitle2">
                                    {format.ml_insights?.predicted_performance !== undefined
                                      ? `${Math.round(format.ml_insights.predicted_performance * 100)}%`
                                      : '--'}
                                  </Typography>
                                </Box>
                              </Stack>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              ) : (
                <Card variant="outlined">
                  <CardContent sx={{ p: 0 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Formato</TableCell>
                          <TableCell>Tipo</TableCell>
                          <TableCell>Categoria</TableCell>
                          <TableCell>Plataformas</TableCell>
                          <TableCell>Usos</TableCell>
                          <TableCell>Score</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredFormats.map((format) => (
                          <TableRow key={format.id}>
                            <TableCell>
                              <Typography fontWeight={600}>{format.name}</Typography>
                              {format.description && (
                                <Typography variant="body2" color="text.secondary">
                                  {format.description}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip size="small" variant="outlined" label={format.type} />
                            </TableCell>
                            <TableCell>
                              <Chip size="small" variant="outlined" label={format.category} />
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={1} flexWrap="wrap">
                                {format.platforms?.slice(0, 2).map((platform) => (
                                  <Chip key={platform} size="small" label={platform} />
                                ))}
                                {format.platforms && format.platforms.length > 2 && (
                                  <Typography variant="caption" color="text.secondary">
                                    +{format.platforms.length - 2}
                                  </Typography>
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell>{format.metrics?.total_uses || 0}</TableCell>
                            <TableCell>
                              {format.ml_insights?.predicted_performance !== undefined
                                ? `${Math.round(format.ml_insights.predicted_performance * 100)}%`
                                : '--'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {filteredFormats.length === 0 && (
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center', py: 6 }}>
                    <Box component="img" src="/modernize/images/svgs/no-data.webp" alt="Sem dados" sx={{ width: 120, mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Nenhum formato encontrado
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Tente ajustar filtros ou termo de busca.
                    </Typography>
                  </CardContent>
                </Card>
              )}
            </Stack>
          </Grid>
        </Grid>
      </Stack>
    </AppShell>
  );
}
