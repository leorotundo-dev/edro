'use client';

import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { IconChevronDown } from '@tabler/icons-react';
import PortalBlueprintWorkspace from '@/components/portal-blueprint/PortalBlueprintWorkspace';
import {
  portalBackendContracts,
  portalImplementationOrder,
  portalMigrationMap,
  portalPageBlueprints,
  portalTargetNavigation,
} from '@/lib/portalBlueprint';

export default function PortalBlueprintIndex() {
  return (
    <Stack spacing={3}>
      <Card
        variant="outlined"
        sx={{
          borderRadius: 4,
          background:
            'linear-gradient(135deg, rgba(232,82,25,0.10) 0%, rgba(61,90,254,0.04) 100%)',
        }}
      >
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="overline" color="primary.main">
              Portal blueprint
            </Typography>
            <Typography variant="h4" fontWeight={800}>
              Sala da Conta
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Arquitetura alvo do portal do cliente, pronta para implementação incremental.
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Navegação alvo</Typography>
            <Grid container spacing={2}>
              {portalTargetNavigation.map((item) => (
                <Grid key={item.id} size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
                    <CardContent>
                      <Stack spacing={1}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                          <Typography variant="subtitle1" fontWeight={700}>
                            {item.label}
                          </Typography>
                          <Chip label={item.status} size="small" />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {item.objective}
                        </Typography>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                          {item.href}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Migração do atual para o alvo</Typography>
            <Grid container spacing={2}>
              {portalMigrationMap.map((item) => (
                <Grid key={`${item.current}-${item.target}`} size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined" sx={{ borderRadius: 3 }}>
                    <CardContent>
                      <Stack spacing={1}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                          <Typography variant="subtitle2" fontWeight={700}>
                            {item.current} → {item.target}
                          </Typography>
                          <Chip label={item.action} size="small" variant="outlined" />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {item.reason}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Ordem de implementação</Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {portalImplementationOrder.map((area, index) => (
                <Chip key={area} label={`${index + 1}. ${portalPageBlueprints[area].title}`} color="primary" />
              ))}
            </Stack>
            <Divider />
            <Typography variant="body2" color="text.secondary">
              A ordem prioriza valor para o cliente e reaproveitamento do que já existe no portal atual.
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">Contratos esperados do backend</Typography>
            {portalBackendContracts.map((group) => (
              <Box key={group.area}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                  {portalPageBlueprints[group.area].title}
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
                      <CardContent>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                          Reaproveita
                        </Typography>
                        <Stack spacing={0.5}>
                          {group.reuse.length ? group.reuse.map((endpoint) => (
                            <Typography key={endpoint} variant="caption" sx={{ fontFamily: 'monospace' }}>
                              {endpoint}
                            </Typography>
                          )) : (
                            <Typography variant="caption" color="text.secondary">
                              Nenhum contrato atual suficiente.
                            </Typography>
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
                      <CardContent>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                          Precisa nascer
                        </Typography>
                        <Stack spacing={0.5}>
                          {group.create.map((endpoint) => (
                            <Typography key={endpoint} variant="caption" sx={{ fontFamily: 'monospace' }}>
                              {endpoint}
                            </Typography>
                          ))}
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Stack spacing={1.5}>
        <Typography variant="h6">Workspaces detalhados</Typography>
        {portalImplementationOrder.map((area) => (
          <Accordion key={area} disableGutters sx={{ borderRadius: '16px !important', overflow: 'hidden' }}>
            <AccordionSummary expandIcon={<IconChevronDown size={18} />}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="subtitle1" fontWeight={700}>
                  {portalPageBlueprints[area].title}
                </Typography>
                <Chip label={portalPageBlueprints[area].status} size="small" />
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <PortalBlueprintWorkspace blueprint={portalPageBlueprints[area]} />
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>
    </Stack>
  );
}
