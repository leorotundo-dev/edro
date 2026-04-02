'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type {
  BlueprintStatus,
  PortalBlockBlueprint,
  PortalPageBlueprint,
} from '@/lib/portalBlueprint';

const STATUS_LABEL: Record<BlueprintStatus, string> = {
  ready: 'Pronto para plugar',
  new: 'Área nova',
  migration: 'Migração do atual',
};

const STATUS_COLOR: Record<BlueprintStatus, 'success' | 'warning' | 'info'> = {
  ready: 'success',
  new: 'info',
  migration: 'warning',
};

function BlockCard({ block }: { block: PortalBlockBlueprint }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
            <Typography variant="subtitle1" fontWeight={700}>
              {block.title}
            </Typography>
            <Chip label={block.kind} size="small" variant="outlined" />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {block.purpose}
          </Typography>

          {block.actions?.length ? (
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {block.actions.map((action) => (
                <Chip key={action} label={action} size="small" color="primary" variant="outlined" />
              ))}
            </Stack>
          ) : null}

          {block.sourceRoutes?.length ? (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Reaproveita rotas atuais
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 0.75 }}>
                {block.sourceRoutes.map((route) => (
                  <Chip key={route} label={route} size="small" />
                ))}
              </Stack>
            </Box>
          ) : null}

          {block.sourceEndpoints?.length ? (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Endpoints base
              </Typography>
              <Stack spacing={0.5} sx={{ mt: 0.75 }}>
                {block.sourceEndpoints.map((endpoint) => (
                  <Typography key={endpoint} variant="caption" sx={{ fontFamily: 'monospace' }}>
                    {endpoint}
                  </Typography>
                ))}
              </Stack>
            </Box>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function PortalBlueprintWorkspace({ blueprint }: { blueprint: PortalPageBlueprint }) {
  return (
    <Stack spacing={2.5}>
      <Card
        variant="outlined"
        sx={{
          borderRadius: 4,
          background:
            'linear-gradient(135deg, rgba(232,82,25,0.08) 0%, rgba(52,71,103,0.02) 100%)',
        }}
      >
        <CardContent>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Chip
                label={STATUS_LABEL[blueprint.status]}
                color={STATUS_COLOR[blueprint.status]}
                size="small"
              />
              {blueprint.currentRoutes.map((route) => (
                <Chip key={route} label={route} size="small" variant="outlined" />
              ))}
            </Stack>
            <Box>
              <Typography variant="h5" fontWeight={800}>
                {blueprint.title}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                {blueprint.subtitle}
              </Typography>
            </Box>
            <Typography variant="body1" color="text.secondary">
              {blueprint.objective}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        {blueprint.blocks.map((block) => (
          <Grid key={block.id} size={{ xs: 12, md: 6 }}>
            <BlockCard block={block} />
          </Grid>
        ))}
      </Grid>

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="subtitle1" fontWeight={700}>
              Notas de implementação
            </Typography>
            <Divider />
            <Stack spacing={1}>
              {blueprint.implementationNotes.map((note) => (
                <Typography key={note} variant="body2" color="text.secondary">
                  - {note}
                </Typography>
              ))}
            </Stack>
            <Divider />
            <Box>
              <Typography variant="caption" color="text.secondary">
                Dados esperados
              </Typography>
              <Stack spacing={0.5} sx={{ mt: 0.75 }}>
                {blueprint.dataSources.map((source) => (
                  <Typography key={source} variant="caption" sx={{ fontFamily: 'monospace' }}>
                    {source}
                  </Typography>
                ))}
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
